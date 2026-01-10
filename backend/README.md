# OCR検索可能PDF変換 - Pythonバックエンド

## 概要

OnnxOCRを使用してスキャンPDFをOCR処理し、検索可能なPDFに変換するPythonバックエンドです。

## 必要パッケージ

```bash
pip install -r requirements.txt
```

または Python 3.10.11 を使用する場合:

```bash
py -3.10 -m pip install -r requirements.txt
```

## 使用方法

### 1. スタンドアロン実行

```bash
py -3.10 main.py input.pdf output.pdf
```

### 2. APIサーバーとして起動

```bash
py -3.10 app.py
```

サーバーは `http://localhost:5000` で起動します。

## APIエンドポイント

### ヘルスチェック

```
GET /api/health
```

### OCR処理

```
POST /api/ocr/process
Content-Type: multipart/form-data

Parameters:
  - file: PDFファイル（必須）
  - dpi: 解像度（オプション、デフォルト300）
  - confidence_threshold: 信頼度閾値（オプション、デフォルト0.5）

Response:
{
  "success": true,
  "file_id": "output_xxx.pdf",
  "pages_processed": 10,
  "message": "OCR処理が完了しました"
}
```

### ファイルダウンロード

```
GET /api/ocr/download/<file_id>
```

## アーキテクチャ

1. **PDFレンダリング**: pypdfium2でPDFページを高解像度画像に変換
2. **OCR処理**: OnnxOCRで日本語OCR処理（CPU推論で高速）
3. **テキストレイヤー生成**: reportlabで透明テキストレイヤーを作成
4. **PDF合成**: pypdfで元PDFとテキストレイヤーを合成

## パフォーマンス

- OnnxOCRはCPU推論で高速
- Tesseract.jsより2-3倍高速
- メモリ効率が良い
