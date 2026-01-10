# OCR検索可能PDF変換 - 使い方ガイド

## 基本的な使い方

### 1. アプリケーションの起動

```powershell
.\start-full.ps1
```

ブラウザで自動的に http://localhost:8080 が開きます。

### 2. PDFファイルのアップロード

1. **ファイルを選択**ボタンをクリック
2. スキャンしたPDFファイルを選択（最大50MB）
3. またはドラッグ＆ドロップでファイルをアップロード

**対応形式:** PDF

### 3. OCR変換の実行

1. **OCR変換開始**ボタンをクリック
2. 進捗バーで処理状況を確認
3. 処理完了まで待機（ページ数により数秒～数分）

### 4. 検索可能PDFのダウンロード

1. 処理完了後、**ダウンロード**ボタンをクリック
2. ファイル名は元のファイル名に `_searchable` が追加されます
3. ダウンロード完了後、「別のファイルを変換」で新しいファイルを処理可能

## PDFでのテキスト検索

### Adobe Acrobat Reader

1. ダウンロードしたPDFを開く
2. `Ctrl+F` (Windows) / `Cmd+F` (Mac) で検索
3. 検索したいテキストを入力
4. OCRで認識されたテキストがハイライトされます

### Chrome / Edge

1. PDFをブラウザで開く
2. `Ctrl+F` (Windows) / `Cmd+F` (Mac) で検索
3. テキストを入力して検索

## よくある質問 (FAQ)

### Q1: どのような文書に対応していますか？

**A:** 
- スキャンしたPDF（画像のみのPDF）
- 日本語の文書（新聞、書籍、資料など）
- 英語・数字も認識可能

### Q2: OCR処理にどれくらい時間がかかりますか？

**A:**
- 1ページ: 約5-10秒
- 10ページ: 約1-2分
- 50ページ: 約5-10分

処理速度はPCのスペックに依存します。

### Q3: ファイルサイズの制限は？

**A:** 最大50MBまで対応。それ以上の場合は：
1. PDFを分割して処理
2. または画像解像度を下げてPDFを再作成

### Q4: OCRの精度を上げるには？

**A:**
- スキャン時に300dpi以上の解像度を使用
- 原稿を正しい向きでスキャン
- 明るさとコントラストを適切に調整
- 文字が鮮明な原稿を使用

### Q5: 処理済みPDFの容量が大きくなりました

**A:** 
OCR処理では透明テキストレイヤーが追加されるため、  
元のPDFより若干サイズが大きくなります（通常5-10%増加）。

### Q6: エラーが発生しました

**A:**
1. ページをリロード
2. ファイルサイズを確認（50MB以下）
3. PDFファイルが破損していないか確認
4. ブラウザのコンソールでエラー内容を確認

## 高度な使い方

### カスタム設定

#### 解像度の変更

`backend/main.py`を編集：

```python
def process_pdf(input_pdf_path, output_pdf_path, dpi=300, ...):
    # dpi=200 にすると処理が高速化（精度は低下）
    # dpi=400 にすると精度が向上（処理は低速化）
```

#### 信頼度閾値の変更

```python
def process_pdf(..., confidence_threshold=0.5, ...):
    # 0.5 = デフォルト（バランス）
    # 0.7 = 高精度（認識される文字が減る）
    # 0.3 = 低精度（誤認識が増える）
```

### APIとして使用

Pythonスクリプトから直接使用：

```python
from main import process_pdf

result = process_pdf(
    "input.pdf",
    "output.pdf",
    dpi=300,
    confidence_threshold=0.5
)

if result["success"]:
    print(f"成功: {result['pages_processed']}ページ処理")
else:
    print(f"エラー: {result['error']}")
```

### REST API

バックエンドをAPIサーバーとして使用：

```bash
# POST /api/ocr/process
curl -X POST http://localhost:5000/api/ocr/process \
  -F "file=@input.pdf" \
  -F "dpi=300" \
  -F "confidence_threshold=0.5"

# GET /api/ocr/download/<file_id>
curl -O http://localhost:5000/api/ocr/download/<file_id>
```

## パフォーマンスチューニング

### 処理速度を優先

```python
# backend/main.py
dpi=200  # 解像度を下げる
confidence_threshold=0.6  # 閾値を上げる
```

### 精度を優先

```python
# backend/main.py
dpi=400  # 解像度を上げる
confidence_threshold=0.4  # 閾値を下げる
```

## トラブルシューティング

### OCR処理が遅い

- 解像度（DPI）を下げる
- PDFのページ数を減らす
- PCのメモリを増やす

### テキスト検索できない

- PDFビューアーでテキスト選択ができるか確認
- OCR処理が完了しているか確認
- 元の文書の画質を確認

### エラー: "ファイルが大きすぎます"

- PDFを分割して処理
- 画像解像度を下げてPDFを再作成

### エラー: "サーバーに接続できません"

- バックエンドが起動しているか確認
- http://localhost:5000/api/health にアクセスして確認

## サポート

問題が解決しない場合：
- GitHub Issues: https://github.com/J1921604/OCR-PDF-Converter/issues
- 詳細なエラーログを添付してください
