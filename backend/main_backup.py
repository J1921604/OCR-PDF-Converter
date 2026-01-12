"""OCR検索可能PDF変換 - メインスクリプト

スキャンPDF/画像を OCR し、元PDF上に透明テキストを埋め込んだ検索可能PDFに変換する。

対応OCRエンジン（複数選択対応）:
- onnxocr: ONNXPaddleOcr (CPU)
- paddleocr: PaddleOCR
"""
import os
import io
import numpy as np
import cv2
import pypdfium2 as pdfium
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from PIL import Image

# --- OCRフレームワーク セッティング ---
# PaddleOCR/PaddlePaddle は初回実行時にモデル/キャッシュを配置する。
# ここを不安定なパス（権限/日本語/特殊文字など）にすると、
# Paddle推論(C++側)がモデルファイルを開けず検出できないケースがある。
#
# そのため「指定があればそれを優先」しつつ、既定は ASCII のみの安全な場所へ寄せる。
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


def _is_ascii_path(path: str) -> bool:
    try:
        path.encode('ascii')
        return True
    except Exception:
        return False


def _default_cache_dir(name: str) -> str:
    """name配下にキャッシュを置くディレクトリを決める（ASCII優先）。"""
    # まずはプロジェクト配下（ASCIIのみなら）
    project_candidate = os.path.join(PROJECT_ROOT, f'.{name}')
    if _is_ascii_path(project_candidate):
        return project_candidate

    # 次にユーザープロファイル配下のASCIIフォルダ
    home = os.path.expanduser('~')
    home_candidate = os.path.join(home, '.ocr-pdf-converter', name)
    if _is_ascii_path(home_candidate):
        return home_candidate

    # 最後にTEMP
    temp = os.environ.get('TEMP') or os.environ.get('TMP') or 'C:\\temp'
    return os.path.join(temp, 'ocr-pdf-converter', name)


PADDLEOCR_HOME = (
    os.environ.get('PADDLEOCR_HOME')
    or os.environ.get('PADDLE_OCR_HOME')
    or _default_cache_dir('paddleocr')
)
PADDLEX_HOME = os.environ.get('PADDLEX_HOME') or _default_cache_dir('paddlex')
PADDLE_HOME = os.environ.get('PADDLE_HOME') or _default_cache_dir('paddle')

os.environ.setdefault('PADDLEOCR_HOME', PADDLEOCR_HOME)
os.environ.setdefault('PADDLE_OCR_HOME', PADDLEOCR_HOME)
os.environ.setdefault('PADDLEX_HOME', PADDLEX_HOME)
os.environ.setdefault('PADDLE_HOME', PADDLE_HOME)

for _d in (PADDLEOCR_HOME, PADDLEX_HOME, PADDLE_HOME):
    try:
        os.makedirs(_d, exist_ok=True)
    except Exception:
        # ディレクトリ作成に失敗しても致命ではないため、後段での例外に任せる
        pass

# PaddleOCRのモデルホスト接続チェックを無効化（ネットワークタイムアウト回避）
os.environ.setdefault('DISABLE_MODEL_SOURCE_CHECK', 'True')


def _patch_paddleocr_paths(base_dir: str):
    """PaddleOCR 2.x のキャッシュ/モデル保存先をプロジェクト配下へ寄せる。

    PaddleOCR 2.7 系は内部で "~/.paddleocr" をハードコードしており、
    環境変数だけでは保存先を変えられない。
    そのため、インポート後にモジュール定数を上書きしてダウンロード先を差し替える。
    """
    try:
        base_dir = os.path.abspath(base_dir)
        os.makedirs(base_dir, exist_ok=True)
        if not base_dir.endswith(os.sep):
            base_dir = base_dir + os.sep
    except Exception:
        return

    # paddleocr/paddleocr.py の BASE_DIR
    try:
        import paddleocr.paddleocr as _paddleocr_mod

        _paddleocr_mod.BASE_DIR = base_dir
    except Exception:
        pass

    # paddleocr/ppocr/utils/network.py の MODELS_DIR
    try:
        from paddleocr.ppocr.utils import network as _paddleocr_network

        _paddleocr_network.MODELS_DIR = os.path.join(base_dir, 'models') + os.sep
    except Exception:
        pass


SUPPORTED_OCR_ENGINES = {'onnxocr', 'paddleocr'}
DEFAULT_OCR_ENGINE = (os.environ.get('OCR_ENGINE', '') or '').strip().lower() or 'paddleocr'

# PaddleOCR は依存が重く、インポートだけで時間がかかったり失敗したりするため
# サーバー起動をブロックしないよう「必要時に遅延インポート」する。
PADDLEOCR_AVAILABLE = False
_PADDLE_IMPORT_ERROR = None
PaddleOCREngine = None

# OnnxOCR も同様に、必要時にだけ遅延インポートする。
ONNXOCR_AVAILABLE = False
_ONNX_IMPORT_ERROR = None
ONNXPaddleOcrEngine = None


def ensure_paddleocr_available():
    """PaddleOCR を必要時にだけインポートして利用可能かを返す。"""
    global PADDLEOCR_AVAILABLE, _PADDLE_IMPORT_ERROR, PaddleOCREngine
    if PADDLEOCR_AVAILABLE:
        return True
    if _PADDLE_IMPORT_ERROR is not None:
        return False
    try:
        from paddleocr import PaddleOCR as _PaddleOCREngine

        # PaddleOCR 2.x の保存先ハードコード対策（~/.paddleocr を上書き）
        _patch_paddleocr_paths(os.environ.get('PADDLEOCR_HOME') or PADDLEOCR_HOME)

        PaddleOCREngine = _PaddleOCREngine
        PADDLEOCR_AVAILABLE = True
        return True
    except Exception as e:
        _PADDLE_IMPORT_ERROR = e
        PADDLEOCR_AVAILABLE = False
        print(f"[WARNING] PaddleOCR not available: {e}")
        return False


def ensure_onnxocr_available():
    """OnnxOCR を必要時にだけインポートして利用可能かを返す。"""
    global ONNXOCR_AVAILABLE, _ONNX_IMPORT_ERROR, ONNXPaddleOcrEngine
    if ONNXOCR_AVAILABLE:
        return True
    if _ONNX_IMPORT_ERROR is not None:
        return False
    try:
        from onnxocr.onnx_paddleocr import ONNXPaddleOcr as _ONNXPaddleOcrEngine

        ONNXPaddleOcrEngine = _ONNXPaddleOcrEngine
        ONNXOCR_AVAILABLE = True
        return True
    except Exception as e:
        _ONNX_IMPORT_ERROR = e
        ONNXOCR_AVAILABLE = False
        print(f"[WARNING] OnnxOCR not available: {e}")
        return False

# 日本語フォント登録
pdfmetrics.registerFont(UnicodeCIDFont("HeiseiKakuGo-W5"))

# OCRエンジンのキャッシュ（グローバルで1回だけ初期化）
_paddle_engine = None
_onnx_engine = None


def _normalize_engine_name(engine_name: str | None) -> str:
    eng = (engine_name or '').strip().lower() or DEFAULT_OCR_ENGINE
    if eng not in SUPPORTED_OCR_ENGINES:
        raise ValueError(f"Unsupported OCR engine: {eng}. Supported: {sorted(SUPPORTED_OCR_ENGINES)}")
    return eng


def get_paddleocr_engine():
    """PaddleOCR エンジンのシングルトンを取得する。"""
    global _paddle_engine

    if not ensure_paddleocr_available():
        msg = "PaddleOCR is not available. Install with: pip install -r requirements.txt"
        if _PADDLE_IMPORT_ERROR is not None:
            msg = f"{msg} (import error: {_PADDLE_IMPORT_ERROR})"
        raise ValueError(msg)

    if _paddle_engine is None:
        print("[OCR] PaddleOCRエンジンを初期化中...")
        try:
            # PaddleOCR 2.x 系（今回の想定）での安定設定。
            # - use_angle_cls は回転分類で遅くなる/失敗要因になることがあるため既定で無効
            # - Windows/CI を想定し GPU は既定で無効
            _paddle_engine = PaddleOCREngine(
                lang='japan',
                use_angle_cls=False,
                use_gpu=False,
                show_log=False,
            )
        except TypeError:
            # 互換: 古い/新しい版で引数が異なる場合がある
            _paddle_engine = PaddleOCREngine(lang='japan')
        print("[OCR] PaddleOCRエンジン初期化完了")
    return _paddle_engine


def get_onnxocr_engine():
    """OnnxOCR(ONNXPaddleOcr) エンジンのシングルトンを取得する。"""
    global _onnx_engine

    if not ensure_onnxocr_available():
        msg = "OnnxOCR is not available. Install with: pip install -r requirements.txt"
        if _ONNX_IMPORT_ERROR is not None:
            msg = f"{msg} (import error: {_ONNX_IMPORT_ERROR})"
        raise ValueError(msg)

    if _onnx_engine is None:
        print("[OCR] OnnxOCR(ONNXPaddleOcr)エンジンを初期化中...")
        # OnnxOCR は CPU 推論が基本。GPU は環境依存なので既定で無効。
        _onnx_engine = ONNXPaddleOcrEngine(use_gpu=False, lang='japan')
        print("[OCR] OnnxOCR(ONNXPaddleOcr)エンジン初期化完了")
    return _onnx_engine


def get_ocr_engine(engine_name: str | None = None):
    """指定したOCRエンジンのインスタンスを返す（互換API）。"""
    eng = _normalize_engine_name(engine_name)
    if eng == 'paddleocr':
        return get_paddleocr_engine()
    if eng == 'onnxocr':
        return get_onnxocr_engine()
    # _normalize_engine_name で弾かれるが保険
    raise ValueError(f"Unsupported OCR engine: {eng}")


def _to_bgr_candidates(pil_img):
    """PaddleOCR に渡す画像候補(BGR ndarray)を複数生成する。

    検出できないケースに備え、
    - 原画像(BGR)
    - グレースケール+二値化
    を試す。
    """
    rgb = np.array(pil_img.convert('RGB'))
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

    candidates = [bgr]

    try:
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        # 高解像度で過度に遅くならないよう軽量な前処理に留める
        gray = cv2.GaussianBlur(gray, (3, 3), 0)
        thr = cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            31,
            10,
        )
        thr_bgr = cv2.cvtColor(thr, cv2.COLOR_GRAY2BGR)
        candidates.append(thr_bgr)
    except Exception as e:
        print(f"[WARN] PaddleOCR前処理スキップ: {e}")

    return candidates


def _paddle_ocr_call(ocr, bgr):
    """PaddleOCR のバージョン差を吸収して OCR を実行する。"""
    # 典型(2.x): ocr.ocr(img, cls=False)
    # 版によって det/rec が必要な場合もあるため、候補を順に試す。
    if hasattr(ocr, 'ocr') and callable(getattr(ocr, 'ocr')):
        for kwargs in (
            {'det': True, 'rec': True, 'cls': False},
            {'cls': False},
            {},
        ):
            try:
                return ocr.ocr(bgr, **kwargs)
            except TypeError:
                continue
    # 3.x系の一部: predict API
    if hasattr(ocr, 'predict') and callable(getattr(ocr, 'predict')):
        try:
            return ocr.predict(input=bgr)
        except TypeError:
            # input 名が違う可能性
            return ocr.predict(bgr)

    raise RuntimeError("Unsupported PaddleOCR API: missing ocr()/predict()")


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
        raise Exception(f"PDFレンダリング失敗: {str(e)}")
    finally:
        try:
            if pdf is not None and hasattr(pdf, 'close'):
                pdf.close()
        except Exception:
            pass


def run_ocr(pil_img, ocr_engine: str | None = None):
    """指定エンジンで OCR を実行する。

    テキスト検出できないケースに備えて、複数の前処理候補で再試行し、
    最も多くテキストが取れた結果を採用する。
    """
    eng = _normalize_engine_name(ocr_engine)
    ocr = get_ocr_engine(eng)

    best = None
    best_count = -1
    last_error = None

    for idx, bgr in enumerate(_to_bgr_candidates(pil_img)):
        try:
            if eng == 'paddleocr':
                results = _paddle_ocr_call(ocr, bgr)
            else:
                # OnnxOCR は PaddleOCR と同様に ocr(bgr) を提供する想定
                results = ocr.ocr(bgr)

            # PaddleOCR の戻り値は実装差異があるため、複数パターンを吸収してカウントする
            count = 0
            try:
                if isinstance(results, list) and results:
                    # 典型: [ [line, line, ...] ]
                    if len(results) == 1 and isinstance(results[0], list):
                        count = len(results[0])
                    # まれ: [line, line, ...]
                    elif isinstance(results[0], (list, dict)):
                        count = len(results)
            except Exception:
                count = 0

            if count > best_count:
                best = results
                best_count = count

            # 最初の候補で検出できたなら早期終了（高速化）
            if best_count >= 1 and idx == 0:
                break
        except Exception as e:
            last_error = e
            continue

    if best is None:
        raise Exception(f"OCR処理失敗 ({eng}): {last_error}")

    return best


def normalize_ocr_results(ocr_results, confidence_threshold=0.5):
    """
    OCR結果を"矩形＋テキスト"に正規化する
    
    Args:
        ocr_results: PaddleOCRの結果
        confidence_threshold: 信頼度の閾値（0.0-1.0）
        
    Returns:
        正規化されたアイテムのリスト
    """
    items = []
    
    if not ocr_results:
        return items

    # PaddleOCR系: [[quad, (text, score)], ...] を 1ページ分として返すことが多い。
    # ただしバージョン/設定により
    # - ocr_results が 1ページ分の配列
    # - ocr_results[0] が 1ページ分の配列
    # の両方があり得るため吸収する。
    page_lines = None
    if isinstance(ocr_results, list) and ocr_results:
        if isinstance(ocr_results[0], list) and ocr_results and len(ocr_results) == 1 and isinstance(ocr_results[0], list):
            # 典型: [ [line, line, ...] ]
            page_lines = ocr_results[0]
        else:
            # 既に1ページ配列の可能性
            page_lines = ocr_results

    if not page_lines:
        return items

    for line in page_lines:
        try:
            if isinstance(line, dict):
                # まれに dict で返る実装差異がある場合
                quad = line.get('bbox') or line.get('box')
                text = line.get('text')
                confidence = float(line.get('score', 1.0))
            else:
                quad = line[0]  # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
                text = line[1][0]  # テキスト
                confidence = float(line[1][1])  # 信頼度
            
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


def process_pdf(
    input_pdf_path,
    output_pdf_path,
    dpi=300,
    confidence_threshold=0.5,
    progress_callback=None,
    ocr_engine='paddleocr',
):
    """PDFを処理して検索可能PDFに変換する（メイン処理）

    1リクエストで利用する OCR エンジンは 1つ（単一選択）。
    
    Args:
        input_pdf_path: 入力PDFファイルパス
        output_pdf_path: 出力PDFファイルパス
        dpi: OCR用の画像解像度
        confidence_threshold: OCR信頼度の閾値
        progress_callback: 進捗コールバック関数 callback(current, total, message)
        ocr_engine: 使用するOCRエンジン（onnxocr / paddleocr）
    """
    pdf = None
    try:
        # 単一エンジン運用: 指定された1つのみで処理
        ocr_engine = _normalize_engine_name(ocr_engine)

        # ここでエンジンの可用性を早めにチェック（ページ処理に入る前に失敗させる）
        if ocr_engine == 'paddleocr':
            if not ensure_paddleocr_available():
                raise ValueError(f"PaddleOCR is not available: {_PADDLE_IMPORT_ERROR}")
        elif ocr_engine == 'onnxocr':
            if not ensure_onnxocr_available():
                raise ValueError(f"OnnxOCR is not available: {_ONNX_IMPORT_ERROR}")

        # PDFページ数を取得
        pdf = pdfium.PdfDocument(input_pdf_path)
        page_count = len(pdf)
        print(f"[開始] PDFファイル: {input_pdf_path}, ページ数: {page_count}")

        # PDFページサイズ（pt）を取得（A4以外も含めて正確に扱う）
        # ここでファイルパスを渡すと Windows でハンドルが残りやすいため、BytesIO 経由にする
        with open(input_pdf_path, 'rb') as f:
            reader_for_size = PdfReader(io.BytesIO(f.read()))
        
        overlay_list = []

        # 精度集計（エンジン表示用）
        total_text_count = 0
        total_conf_sum = 0.0
        
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
                
                # 2. OCRを実行
                print(f"  → {ocr_engine} OCR実行中...")
                ocr_results = run_ocr(pil_img, ocr_engine)
                ocr_items = normalize_ocr_results(ocr_results, confidence_threshold)
                if ocr_items:
                    avg_confidence = sum(item['confidence'] for item in ocr_items) / len(ocr_items)
                    print(f"    ✓ {len(ocr_items)}個のテキスト検出 (平均信頼度: {avg_confidence:.2%})")

                    total_text_count += len(ocr_items)
                    total_conf_sum += sum(item['confidence'] for item in ocr_items)
                else:
                    print("    ✗ テキストが検出されませんでした")

                # 3. 透明テキストレイヤーPDFを作成
                if ocr_items:
                    overlay_bytes = create_overlay_pdf(
                        page_w_pt,
                        page_h_pt,
                        ocr_items,
                        scale_x=scale_x,
                        scale_y=scale_y,
                    )
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
        
        overall_avg_conf = (total_conf_sum / total_text_count) if total_text_count > 0 else 0.0

        return {
            "success": True,
            "output_path": output_pdf_path,
            "pages_processed": page_count,
            "engine": ocr_engine,
            "engine_stats": {
                "avg_confidence": overall_avg_conf,
                "total_text_count": total_text_count,
                "pages_processed": page_count,
            },
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
