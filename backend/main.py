"""
OCR検索可能PDF変換 - メインスクリプト
OnnxOCRを使用してスキャンPDFをOCR処理し、検索可能なPDFに変換します。
"""
import io
import numpy as np
import cv2
import pypdfium2 as pdfium
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from onnxocr.onnx_paddleocr import ONNXPaddleOcr

# 日本語フォント登録
pdfmetrics.registerFont(UnicodeCIDFont("HeiseiKakuGo-W5"))

# OCRエンジンの初期化（グローバルで1回だけ）
ocr_engine = None


def get_ocr_engine():
    """OCRエンジンのシングルトンを取得"""
    global ocr_engine
    if ocr_engine is None:
        print("[OCR] OnnxOCRエンジンを初期化中...")
        ocr_engine = ONNXPaddleOcr(use_gpu=False, lang="japan")
        print("[OCR] OnnxOCRエンジン初期化完了")
    return ocr_engine


def render_pdf_to_image(pdf_path, page_number, dpi=300):
    """
    PDFページを画像（PIL Image）として取り出す
    
    Args:
        pdf_path: PDFファイルのパス
        page_number: ページ番号（0始まり）
        dpi: 解像度（デフォルト300dpi）
        
    Returns:
        PIL Image, width, height
    """
    try:
        pdf = pdfium.PdfDocument(pdf_path)
        page = pdf[page_number]
        scale = dpi / 72
        pil_img = page.render(scale=scale).to_pil()
        width, height = pil_img.size
        return pil_img, width, height
    except Exception as e:
        raise Exception(f"PDF画像レンダリング失敗 (ページ {page_number + 1}): {str(e)}")


def run_ocr(pil_img):
    """
    OCRの実行
    
    Args:
        pil_img: PIL Image
        
    Returns:
        OCR結果のリスト
    """
    try:
        # PIL ImageをOpenCV形式に変換
        rgb = np.array(pil_img)
        bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        
        # OCR実行
        ocr = get_ocr_engine()
        results = ocr.ocr(bgr)
        
        return results
    except Exception as e:
        raise Exception(f"OCR処理失敗: {str(e)}")


def normalize_ocr_results(ocr_results, confidence_threshold=0.5):
    """
    OCR結果を"矩形＋テキスト"に正規化する
    
    Args:
        ocr_results: OnnxOCRの結果
        confidence_threshold: 信頼度の閾値（0.0-1.0）
        
    Returns:
        正規化されたアイテムのリスト
    """
    items = []
    
    if not ocr_results or not ocr_results[0]:
        return items
    
    for line in ocr_results[0]:
        try:
            quad = line[0]  # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
            text = line[1][0]  # テキスト
            confidence = line[1][1]  # 信頼度
            
            # 信頼度フィルタリング
            if confidence < confidence_threshold:
                continue
            
            # 空のテキストを除外
            if not text or text.strip() == '':
                continue
            
            # 矩形の座標を取得
            xs = [p[0] for p in quad]
            ys = [p[1] for p in quad]
            
            items.append({
                "text": text,
                "bbox": (min(xs), min(ys), max(xs), max(ys)),
                "confidence": confidence,
            })
        except (IndexError, KeyError, TypeError) as e:
            print(f"[警告] OCR結果の解析エラー: {e}, line: {line}")
            continue
    
    return items


def create_overlay_pdf(page_w, page_h, ocr_items):
    """
    ReportLabで「透明テキストレイヤーPDF」を作る
    
    Args:
        page_w: ページ幅
        page_h: ページ高さ
        ocr_items: 正規化されたOCRアイテムのリスト
        
    Returns:
        PDFのバイトデータ
    """
    try:
        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=(page_w, page_h))
        c.setFillAlpha(0.0)  # 完全透明
        
        for item in ocr_items:
            x1, y1, x2, y2 = item["bbox"]
            text = item["text"]
            
            # フォントサイズを矩形の高さに合わせる
            fontsize = max(6, (y2 - y1) * 0.9)
            c.setFont("HeiseiKakuGo-W5", fontsize)
            
            # PDF座標は左下原点なので上下を反転
            baseline_y = page_h - y2
            c.drawString(x1, baseline_y, text)
        
        c.save()
        return buf.getvalue()
    except Exception as e:
        raise Exception(f"オーバーレイPDF作成失敗: {str(e)}")


def merge_overlay(original_pdf_path, overlay_bytes_list, output_pdf_path):
    """
    PyPDFで元PDFとオーバーレイPDFを合体する
    
    Args:
        original_pdf_path: 元のPDFファイルパス
        overlay_bytes_list: 各ページのオーバーレイPDFバイトデータのリスト
        output_pdf_path: 出力PDFファイルパス
    """
    try:
        reader = PdfReader(original_pdf_path)
        writer = PdfWriter()
        
        for page_num, overlay_bytes in enumerate(overlay_bytes_list):
            page = reader.pages[page_num]
            
            if overlay_bytes:
                overlay_reader = PdfReader(io.BytesIO(overlay_bytes))
                overlay_page = overlay_reader.pages[0]
                page.merge_page(overlay_page)
            
            writer.add_page(page)
        
        with open(output_pdf_path, "wb") as f:
            writer.write(f)
            
        print(f"[完了] 検索可能PDF生成完了: {output_pdf_path}")
    except Exception as e:
        raise Exception(f"PDF合成失敗: {str(e)}")


def process_pdf(input_pdf_path, output_pdf_path, dpi=300, confidence_threshold=0.5, progress_callback=None):
    """
    PDFを処理して検索可能PDFに変換する（メイン処理）
    
    Args:
        input_pdf_path: 入力PDFファイルパス
        output_pdf_path: 出力PDFファイルパス
        dpi: OCR用の画像解像度
        confidence_threshold: OCR信頼度の閾値
        progress_callback: 進捗コールバック関数 callback(current, total, message)
    """
    try:
        # PDFページ数を取得
        pdf = pdfium.PdfDocument(input_pdf_path)
        page_count = len(pdf)
        print(f"[開始] PDFファイル: {input_pdf_path}, ページ数: {page_count}")
        
        overlay_list = []
        
        for page_num in range(page_count):
            try:
                if progress_callback:
                    progress_callback(page_num + 1, page_count, f"ページ {page_num + 1}/{page_count} を処理中...")
                
                print(f"\n[処理中] ページ {page_num + 1}/{page_count}")
                
                # 1. PDFページを画像として取り出す
                pil_img, img_width, img_height = render_pdf_to_image(input_pdf_path, page_num, dpi)
                print(f"  → 画像レンダリング完了: {img_width}x{img_height}px")
                
                # 2. OCRの実行
                ocr_results = run_ocr(pil_img)
                print(f"  → OCR実行完了")
                
                # 3. OCR結果を正規化
                ocr_items = normalize_ocr_results(ocr_results, confidence_threshold)
                print(f"  → OCR結果正規化完了: {len(ocr_items)}個のテキスト検出")
                
                # 4. 透明テキストレイヤーPDFを作成
                if ocr_items:
                    overlay_bytes = create_overlay_pdf(img_width, img_height, ocr_items)
                    print(f"  → オーバーレイPDF作成完了")
                else:
                    overlay_bytes = None
                    print(f"  → テキストが検出されませんでした")
                
                overlay_list.append(overlay_bytes)
                
            except Exception as e:
                print(f"[エラー] ページ {page_num + 1} の処理でエラー: {e}")
                overlay_list.append(None)
                continue
        
        # 5. 元PDFとオーバーレイPDFを合体
        if progress_callback:
            progress_callback(page_count, page_count, "PDF合成中...")
        
        merge_overlay(input_pdf_path, overlay_list, output_pdf_path)
        
        if progress_callback:
            progress_callback(page_count, page_count, "完了")
        
        return {
            "success": True,
            "output_path": output_pdf_path,
            "pages_processed": page_count,
        }
        
    except Exception as e:
        error_msg = f"PDF処理エラー: {str(e)}"
        print(f"[エラー] {error_msg}")
        return {
            "success": False,
            "error": error_msg,
        }


if __name__ == "__main__":
    # テスト実行
    import sys
    
    if len(sys.argv) < 3:
        print("使用方法: python main.py <入力PDF> <出力PDF>")
        sys.exit(1)
    
    input_pdf = sys.argv[1]
    output_pdf = sys.argv[2]
    
    def print_progress(current, total, message):
        print(f"進捗: [{current}/{total}] {message}")
    
    result = process_pdf(input_pdf, output_pdf, progress_callback=print_progress)
    
    if result["success"]:
        print(f"\n✓ 成功: {result['pages_processed']}ページを処理しました")
        print(f"  出力: {result['output_path']}")
    else:
        print(f"\n✗ 失敗: {result['error']}")
        sys.exit(1)
