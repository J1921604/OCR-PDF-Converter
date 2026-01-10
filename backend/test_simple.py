"""
簡易テスト - パッケージインポートのみ
"""
import sys

print("=" * 60)
print("簡易パッケージテスト")
print("=" * 60)
print(f"Python: {sys.version}")
print("=" * 60 + "\n")

packages = [
    "numpy",
    "cv2",
    "pypdfium2",
    "pypdf",
    "reportlab",
    "flask",
    "flask_cors",
    "PIL",
]

success_count = 0
for package in packages:
    try:
        __import__(package)
        print(f"✓ {package:15s} ... OK")
        success_count += 1
    except ImportError as e:
        print(f"✗ {package:15s} ... FAILED: {e}")

print("\n" + "=" * 60)
print(f"結果: {success_count}/{len(packages)} パッケージ正常")
print("=" * 60)

# OnnxOCRは最後にテスト（時間がかかるため）
print("\nOnnxOCRをテスト中...")
try:
    import onnxocr
    print("✓ onnxocr インポート成功")
    print("  注意: 初回実行時はモデルダウンロードが必要です")
except ImportError as e:
    print(f"✗ onnxocr インポート失敗: {e}")
