"""
Pythonバックエンドの基本機能テスト
"""
import sys
import os

def test_imports():
    """必要なパッケージのインポートテスト"""
    print("=" * 60)
    print("パッケージインポートテスト")
    print("=" * 60)
    
    tests = [
        ("numpy", "NumPy"),
        ("cv2", "OpenCV"),
        ("pypdfium2", "pypdfium2"),
        ("pypdf", "pypdf"),
        ("reportlab", "ReportLab"),
        ("onnxocr", "OnnxOCR"),
        ("flask", "Flask"),
    ]
    
    results = []
    for module_name, display_name in tests:
        try:
            __import__(module_name)
            print(f"✓ {display_name:15s} ... OK")
            results.append(True)
        except ImportError as e:
            print(f"✗ {display_name:15s} ... FAILED: {e}")
            results.append(False)
    
    return all(results)


def test_ocr_engine():
    """OCRエンジンの初期化テスト"""
    print("\n" + "=" * 60)
    print("OCRエンジン初期化テスト")
    print("=" * 60)
    
    try:
        from main import get_ocr_engine
        print("OCRエンジンを初期化中...")
        ocr = get_ocr_engine()
        print("✓ OCRエンジン初期化成功")
        return True
    except Exception as e:
        print(f"✗ OCRエンジン初期化失敗: {e}")
        return False


def test_pdf_functions():
    """PDF処理関数のテスト"""
    print("\n" + "=" * 60)
    print("PDF処理関数テスト")
    print("=" * 60)
    
    try:
        from main import render_pdf_to_image, run_ocr, normalize_ocr_results
        from main import create_overlay_pdf, merge_overlay
        
        functions = [
            "render_pdf_to_image",
            "run_ocr",
            "normalize_ocr_results",
            "create_overlay_pdf",
            "merge_overlay",
        ]
        
        for func_name in functions:
            print(f"✓ {func_name:30s} ... 定義済み")
        
        return True
    except Exception as e:
        print(f"✗ 関数インポートエラー: {e}")
        return False


def test_flask_app():
    """Flask APIのテスト"""
    print("\n" + "=" * 60)
    print("Flask API定義テスト")
    print("=" * 60)
    
    try:
        from app import app
        
        endpoints = [
            "/api/health",
            "/api/ocr/process",
            "/api/ocr/download/<file_id>",
        ]
        
        print("✓ Flaskアプリケーション初期化成功")
        for endpoint in endpoints:
            print(f"  - エンドポイント: {endpoint}")
        
        return True
    except Exception as e:
        print(f"✗ Flask初期化失敗: {e}")
        return False


def run_all_tests():
    """全テストを実行"""
    print("\n" + "=" * 60)
    print("OCR検索可能PDF変換バックエンド - テストスイート")
    print("=" * 60)
    print(f"Python: {sys.version}")
    print("=" * 60 + "\n")
    
    results = []
    
    # 各テストを実行
    results.append(("パッケージインポート", test_imports()))
    results.append(("OCRエンジン初期化", test_ocr_engine()))
    results.append(("PDF処理関数", test_pdf_functions()))
    results.append(("Flask API", test_flask_app()))
    
    # 結果サマリー
    print("\n" + "=" * 60)
    print("テスト結果サマリー")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status:10s} {test_name}")
    
    print("=" * 60)
    print(f"合計: {passed}/{total} テスト合格")
    
    if passed == total:
        print("✓ 全てのテストが合格しました！")
        return 0
    else:
        print(f"✗ {total - passed}個のテストが失敗しました")
        return 1


if __name__ == "__main__":
    sys.exit(run_all_tests())
