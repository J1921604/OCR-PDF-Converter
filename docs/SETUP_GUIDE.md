# セットアップガイド

## 前提条件

### 必須ソフトウェア

1. **Python 3.10.11**
   - ダウンロード: https://www.python.org/downloads/release/python-31011/
   - インストール時に「Add Python to PATH」をチェック
   - 確認: `py -3.10 --version`

2. **Node.js 18以上**
   - ダウンロード: https://nodejs.org/
   - 確認: `node --version`

## インストール手順

### 1. リポジトリのクローン

```powershell
git clone https://github.com/J1921604/OCR-PDF-Converter.git
cd OCR-PDF-Converter
```

### 2. ワンコマンドセットアップ（推奨）

```powershell
.\start-full.ps1
```

このスクリプトが以下を自動実行します：
- Python/Node.jsの存在確認
- 依存パッケージのインストール
- バックエンドとフロントエンドの起動

### 3. 手動セットアップ

#### バックエンド (Python)

```powershell
cd backend
py -3.10 -m pip install -r requirements.txt
```

**インストールされるパッケージ:**
- numpy: 数値計算
- opencv-python: 画像処理
- pypdf: PDF操作
- pypdfium2: PDFレンダリング
- reportlab: PDF生成
- onnxocr: OCRエンジン（初回起動時にモデルをダウンロード）
- Flask: APIサーバー
- Flask-CORS: CORS対応
- Pillow: 画像処理

**起動:**
```powershell
py -3.10 app.py
```
→ http://localhost:5000 で起動

#### フロントエンド (React)

```powershell
cd ..
npm install
npm start
```
→ http://localhost:8080 で起動

## トラブルシューティング

### Python 3.10.11が見つからない

```powershell
py --list
```
でインストール済みPythonバージョンを確認。

複数バージョンがある場合：
```powershell
py -3.10 --version
```

### OnnxOCRのインストールに時間がかかる

初回インストール時、OCRモデル（約200MB）がダウンロードされます。  
ネットワーク速度により5-10分かかることがあります。

### ポートが使用中

**バックエンド (5000) が使用中:**
```powershell
# app.py の最終行を編集
app.run(host='0.0.0.0', port=5001, debug=True)
```

**フロントエンド (8080) が使用中:**
```powershell
# webpack.config.js の devServer.port を変更
```

### CORSエラー

`.env`ファイルでAPIのURLを確認：
```
REACT_APP_API_URL=http://localhost:5000
```

## 開発モード

### バックエンドのみ起動

```powershell
.\start-backend.ps1
```

### フロントエンドのみ起動

```powershell
npm start
```

## 本番ビルド

```powershell
npm run build
```

`dist/`フォルダに本番用ファイルが生成されます。

## テスト実行

### バックエンドテスト

```powershell
cd backend
py -3.10 test_backend.py
```

### フロントエンドテスト

```powershell
npm test
```

## パフォーマンス最適化

### OCR処理の高速化

1. **解像度を下げる（精度とのトレードオフ）**
   ```python
   # main.py
   def process_pdf(input_pdf_path, output_pdf_path, dpi=200, ...):
   ```

2. **信頼度閾値を上げる（誤認識の削減）**
   ```python
   def process_pdf(..., confidence_threshold=0.7, ...):
   ```

### メモリ使用量の削減

大きなPDFを処理する場合、ページごとに処理しメモリを解放します。  
現在の実装ではこれが既に実装されています。

## 次のステップ

セットアップ完了後：
1. テストPDFで動作確認
2. [使い方ガイド](README.md#使い方)を参照
3. カスタマイズ（DPI、信頼度閾値など）
