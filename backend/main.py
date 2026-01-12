"""
OCR検索可能PDF変換 - メインスクリプト
OnnxOCR、Surya、PaddleOCRを使用してスキャンPDFをOCR処理し、検索可能なPDFに変換します。
"""
import io
import numpy as np
import cv2
import pypdfium2 as pdfium
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from PIL import Image

# OnnxOCR
from onnxocr.onnx_paddleocr import ONNXPaddleOcr

# Surya OCR
try:
    from surya.ocr import run_ocr as surya_run_ocr
    from surya.model.detection.model import load_model as load_det_model, load_processor as load_det_processor
    from surya.model.recognition.model import load_model as load_rec_model
    from surya.model.recognition.processor import load_processor as load_rec_processor
    SURYA_AVAILABLE = True
except ImportError:
    SURYA_AVAILABLE = False
    print("[WARNING] Surya OCR not available. Install with: pip install surya-ocr")

# PaddleOCR
try:
    from paddleocr import PaddleOCR as PaddleOCREngine
    PADDLEOCR_AVAILABLE = True
except ImportError:
    PADDLEOCR_AVAILABLE = False
    print("[WARNING] PaddleOCR not available. Install with: pip install paddleocr paddlepaddle")

# 日本語フォント登録
pdfmetrics.registerFont(UnicodeCIDFont("HeiseiKakuGo-W5"))

# OCRエンジンのキャッシュ（グローバルで1回だけ初期化）
ocr_engines = {
    'onnxocr': None,
    'surya': None,
    'paddleocr': None
}


def get_ocr_engine(engine_name='onnxocr'):
    """OCRエンジンのシングルトンを取得
    
    Args:
        engine_name: 'onnxocr', 'surya', 'paddleocr'のいずれか
    """
    global ocr_engines
    
    if engine_name == 'onnxocr':
        if ocr_engines['onnxocr'] is None:
            print("[OCR] OnnxOCRエンジンを初期化中...")
            ocr_engines['onnxocr'] = ONNXPaddleOcr(use_gpu=False, lang="japan")
            print("[OCR] OnnxOCRエンジン初期化完了")
        return ocr_engines['onnxocr']
    
    elif engine_name == 'surya' and SURYA_AVAILABLE:
        if ocr_engines['surya'] is None:
            print("[OCR] Suryaエンジンを初期化中...")
            det_model = load_det_model()
            det_processor = load_det_processor()
            rec_model = load_rec_model()
            rec_processor = load_rec_processor()
            ocr_engines['surya'] = {
                'det_model': det_model,
                'det_processor': det_processor,
                'rec_model': rec_model,
                'rec_processor': rec_processor
            }
            print("[OCR] Suryaエンジン初期化完了")
        return ocr_engines['surya']
    
    elif engine_name == 'paddleocr' and PADDLEOCR_AVAILABLE:
        if ocr_engines['paddleocr'] is None:
            print("[OCR] PaddleOCRエンジンを初期化中...")
            ocr_engines['paddleocr'] = PaddleOCREngine(use_angle_cls=True, lang='japan', use_gpu=False)
            print("[OCR] PaddleOCRエンジン初期化完了")
        return ocr_engines['paddleocr']
    
    else:
        raise ValueError(f"Unsupported or unavailable OCR engine: {engine_name}")


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
    pdf = None
    page = None
    try:
        pdf = pdfium.PdfDocument(pdf_path)
        page = pdf[page_number]
        scale = dpi / 72
        pil_img = page.render(scale=scale).to_pil()
        width, height = pil_img.size
        return pil_img, width, height
    except Exception as e:
        raise Exception(f"PDF画像レンダリング失敗 (ページ {page_number + 1}): {str(e)}")
    finally:
        # Windowsではファイルハンドルが残ると入力PDFの削除が失敗するため、明示的にクローズする
        try:
            if page is not None and hasattr(page, 'close'):
                page.close()
        except Exception:
            pass
        try:
            if pdf is not None and hasattr(pdf, 'close'):
                pdf.close()
        except Exception:
            pass


def run_ocr(pil_img, engine_name='onnxocr'):
    """
    OCRの実行
    
    Args:
        pil_img: PIL Image
        engine_name: 'onnxocr', 'surya', 'paddleocr'のいずれか
        
    Returns:
        OCR結果のリスト（標準形式に正規化済み）
    """
    try:
        if engine_name == 'onnxocr':
            # PIL ImageをOpenCV形式に変換
            rgb = np.array(pil_img)
            bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

            # ---- OCR前処理（精度・安定性向上） ----
            try:
                gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
                gray = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
                thr = cv2.adaptiveThreshold(
                    gray,
                    255,
                    cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                    cv2.THRESH_BINARY,
                    31,
                    10,
                )
                bgr = cv2.cvtColor(thr, cv2.COLOR_GRAY2BGR)
            except Exception as e:
                print(f"[WARN] 前処理スキップ: {e}")
            
            # OCR実行
            ocr = get_ocr_engine('onnxocr')
            results = ocr.ocr(bgr)
            return results
        
        elif engine_name == 'surya' and SURYA_AVAILABLE:
            # Surya OCR実行
            engine = get_ocr_engine('surya')
            images = [pil_img]
            
            predictions = surya_run_ocr(
                images,
                [engine['det_model']] * len(images),
                [engine['det_processor']] * len(images),
                [engine['rec_model']] * len(images),
                [engine['rec_processor']] * len(images)
            )
            
            # Surya結果を標準形式に変換
            if predictions and len(predictions) > 0:
                pred = predictions[0]
                results = [[]]
                for text_line in pred.text_lines:
                    # Suryaの座標を4点形式に変換
                    bbox = text_line.bbox
                    quad = [
                        [bbox[0], bbox[1]],  # 左上
                        [bbox[2], bbox[1]],  # 右上
                        [bbox[2], bbox[3]],  # 右下
                        [bbox[0], bbox[3]]   # 左下
                    ]
                    results[0].append([
                        quad,
                        [text_line.text, text_line.confidence if hasattr(text_line, 'confidence') else 0.9]
                    ])
                return results
            return [[]]
        
        elif engine_name == 'paddleocr' and PADDLEOCR_AVAILABLE:
            # PaddleOCR実行
            ocr = get_ocr_engine('paddleocr')
            rgb = np.array(pil_img)
            results = ocr.ocr(rgb, cls=True)
            return results
        
        else:
            raise ValueError(f"Unsupported or unavailable OCR engine: {engine_name}")
        
    except Exception as e:
        raise Exception(f"OCR処理失敗 ({engine_name}): {str(e)}")


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


def create_overlay_pdf(page_w_pt, page_h_pt, ocr_items, scale_x=1.0, scale_y=1.0):
    """
    ReportLabで「透明テキストレイヤーPDF」を作る
    
    Args:
        page_w_pt: ページ幅（PDFポイント）
        page_h_pt: ページ高さ（PDFポイント）
        ocr_items: 正規化されたOCRアイテムのリスト
        scale_x: 画像px→PDFptのXスケール
        scale_y: 画像px→PDFptのYスケール
        
    Returns:
        PDFのバイトデータ
    """
    try:
        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=(page_w_pt, page_h_pt))
        c.setFillAlpha(0.0)  # 完全透明
        
        for item in ocr_items:
            x1, y1, x2, y2 = item["bbox"]
            text = item["text"]

            # OCR結果(画像px)をPDFポイント座標へ変換
            x1_pt = x1 * scale_x
            y1_pt = y1 * scale_y
            x2_pt = x2 * scale_x
            y2_pt = y2 * scale_y
            
            # フォントサイズを矩形の高さに合わせる
            fontsize = max(6, (y2_pt - y1_pt) * 0.9)
            c.setFont("HeiseiKakuGo-W5", fontsize)
            
            # PDF座標は左下原点なので上下を反転
            baseline_y = page_h_pt - y2_pt
            c.drawString(x1_pt, baseline_y, text)
        
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
        # Windowsでのファイルロック回避のため、BytesIOで読み込む
        with open(original_pdf_path, 'rb') as f:
            reader = PdfReader(io.BytesIO(f.read()))
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


def process_pdf(input_pdf_path, output_pdf_path, dpi=300, confidence_threshold=0.5, progress_callback=None, ocr_engines=['onnxocr', 'surya', 'paddleocr']):
    """
    PDFを処理して検索可能PDFに変換する（メイン処理）
    複数のOCRエンジンを使用し、精度比較を行う
    
    Args:
        input_pdf_path: 入力PDFファイルパス
        output_pdf_path: 出力PDFファイルパス
        dpi: OCR用の画像解像度
        confidence_threshold: OCR信頼度の閾値
        progress_callback: 進捗コールバック関数 callback(current, total, message)
        ocr_engines: 使用するOCRエンジンのリスト（デフォルト: 全エンジン）
    """
    pdf = None
    try:
        # PDFページ数を取得
        pdf = pdfium.PdfDocument(input_pdf_path)
        page_count = len(pdf)
        print(f"[開始] PDFファイル: {input_pdf_path}, ページ数: {page_count}")

        # PDFページサイズ（pt）を取得（A4以外も含めて正確に扱う）
        # ここでファイルパスを渡すと Windows でハンドルが残りやすいため、BytesIO 経由にする
        with open(input_pdf_path, 'rb') as f:
            reader_for_size = PdfReader(io.BytesIO(f.read()))
        
        overlay_list = []
        all_engine_results = []  # 全ページの各エンジン結果を保存
        
        for page_num in range(page_count):
            try:
                if progress_callback:
                    progress_callback(page_num + 1, page_count, f"ページ {page_num + 1}/{page_count} を処理中...")
                
                print(f"\n[処理中] ページ {page_num + 1}/{page_count}")
                
                # 1. PDFページを画像として取り出す
                pil_img, img_width, img_height = render_pdf_to_image(input_pdf_path, page_num, dpi)
                print(f"  → 画像レンダリング完了: {img_width}x{img_height}px")

                # PDFのページサイズ（ポイント）
                pdf_page = reader_for_size.pages[page_num]
                page_w_pt = float(pdf_page.mediabox.width)
                page_h_pt = float(pdf_page.mediabox.height)

                # 画像px → PDFpt 変換係数
                scale_x = page_w_pt / float(img_width)
                scale_y = page_h_pt / float(img_height)
                
                # 2. 複数のOCRエンジンで実行し、精度を比較
                best_ocr_items = None
                best_confidence = 0.0
                best_engine = None
                engine_results = {}
                
                for engine_name in ocr_engines:
                    # エンジンが利用可能かチェック
                    if engine_name == 'surya' and not SURYA_AVAILABLE:
                        continue
                    if engine_name == 'paddleocr' and not PADDLEOCR_AVAILABLE:
                        continue
                    
                    try:
                        print(f"  → {engine_name} OCR実行中...")
                        ocr_results = run_ocr(pil_img, engine_name)
                        ocr_items = normalize_ocr_results(ocr_results, confidence_threshold)
                        
                        # 平均信頼度を計算
                        if ocr_items:
                            avg_confidence = sum(item['confidence'] for item in ocr_items) / len(ocr_items)
                            engine_results[engine_name] = {
                                'items': ocr_items,
                                'confidence': avg_confidence,
                                'count': len(ocr_items)
                            }
                            print(f"    ✓ {len(ocr_items)}個のテキスト検出 (平均信頼度: {avg_confidence:.2%})")
                            
                            # 最も信頼度の高いエンジンを選択
                            if avg_confidence > best_confidence:
                                best_confidence = avg_confidence
                                best_ocr_items = ocr_items
                                best_engine = engine_name
                        else:
                            print(f"    ✗ テキストが検出されませんでした")
                    except Exception as e:
                        print(f"    ✗ {engine_name} エラー: {e}")
                        continue
                
                # 最良のOCR結果を表示
                if best_engine:
                    print(f"  → 最良エンジン: {best_engine} (信頼度: {best_confidence:.2%})")
                
                # 3. 透明テキストレイヤーPDFを作成
                if best_ocr_items:
                    overlay_bytes = create_overlay_pdf(page_w_pt, page_h_pt, best_ocr_items, scale_x=scale_x, scale_y=scale_y)
                    print(f"  → オーバーレイPDF作成完了")
                else:
                    overlay_bytes = None
                    print(f"  → テキストが検出されませんでした")
                
                overlay_list.append(overlay_bytes)
                all_engine_results.append({
                    'page': page_num + 1,
                    'engine_results': engine_results,
                    'best_engine': best_engine,
                    'best_confidence': best_confidence
                })
                
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
        
        # エンジン精度の集計
        accuracy_summary = {}
        for engine_name in ocr_engines:
            if engine_name == 'surya' and not SURYA_AVAILABLE:
                continue
            if engine_name == 'paddleocr' and not PADDLEOCR_AVAILABLE:
                continue
            
            confidences = []
            counts = []
            for page_result in all_engine_results:
                if engine_name in page_result['engine_results']:
                    confidences.append(page_result['engine_results'][engine_name]['confidence'])
                    counts.append(page_result['engine_results'][engine_name]['count'])
            
            if confidences:
                accuracy_summary[engine_name] = {
                    'avg_confidence': sum(confidences) / len(confidences),
                    'total_text_count': sum(counts),
                    'pages_processed': len(confidences)
                }
        
        return {
            "success": True,
            "output_path": output_pdf_path,
            "pages_processed": page_count,
            "accuracy_summary": accuracy_summary,
            "page_details": all_engine_results
        }
        
    except Exception as e:
        error_msg = f"PDF処理エラー: {str(e)}"
        print(f"[エラー] {error_msg}")
        return {
            "success": False,
            "error": error_msg,
        }
    finally:
        try:
            if pdf is not None and hasattr(pdf, 'close'):
                pdf.close()
        except Exception:
            pass


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
