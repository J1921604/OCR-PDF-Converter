
[⚡OCR 革命⚡ Surya で爆速！GitHub Copilot × Agent Skill で OCR 自動化🚀 #Python - Qiita](https://qiita.com/aktsmm/items/5b1d6346fa6fe11adbfc)

## Surya のすごいところ

### 1. 導入がめっちゃ簡単

```
# これだけ！
pip install surya-ocr
```

PyTorch さえ入っていれば、あとは `surya_ocr` コマンドで OK！

### 2. GPU 自動検出

CUDA 環境があれば勝手に GPU を使ってくれます。環境変数で明示的に指定も可能：

```
# 環境変数で GPU を強制指定（任意）
set TORCH_DEVICE=cuda
```

### 3. 多機能

- **OCR**（文字認識）
- **レイアウト解析**（段組みなど）
- **表認識**
- **LaTeX 数式 OCR**

### 4. 言語自動検出

最新 API では `languages` パラメータが廃止され、**自動検出のみ**に！  
日本語も英語もごちゃ混ぜの画像でも OK 👌

---

## 実際に使ってみよう！

実際に Surya で OCR を実行している様子がこちら 👇  
英語と日本語まじりの画面ショットでもきれいに OCR できていることがわかります。

[![ocr-demo-gif-anima.png](https://qiita-user-contents.imgix.net/https%3A%2F%2Fqiita-image-store.s3.ap-northeast-1.amazonaws.com%2F0%2F2982508%2Fef90e515-2add-4371-ae8b-64904eb0220d.png?ixlib=rb-4.0.0&auto=format&gif-q=60&q=75&s=cc01e4d333a9e1a76d87dca5d0d909d0)](https://qiita-user-contents.imgix.net/https%3A%2F%2Fqiita-image-store.s3.ap-northeast-1.amazonaws.com%2F0%2F2982508%2Fef90e515-2add-4371-ae8b-64904eb0220d.png?ixlib=rb-4.0.0&auto=format&gif-q=60&q=75&s=cc01e4d333a9e1a76d87dca5d0d909d0)

スクリーンショットから一瞬でテキストが抽出されてます ✨

### CLI で使う場合

```
# 画像から OCR
surya_ocr screenshot.png

# GUI アプリ（要 streamlit）
surya_gui
```

### Python から使う場合

```
from PIL import Image
from surya.recognition import RecognitionPredictor
from surya.detection import DetectionPredictor

# 画像を読み込み
image = Image.open("screenshot.png")

# Predictor を初期化（初回はモデルダウンロード）
recognition_predictor = RecognitionPredictor()
detection_predictor = DetectionPredictor()

# OCR 実行
predictions = recognition_predictor([image], det_predictor=detection_predictor)

# 結果を表示
for pred in predictions:
    for text_line in pred.text_lines:
        print(text_line.text)
```

### VRAM 使用量について

私は **RTX 4060 Ti 16GB** でデフォルト値のまま OOM エラーなしで動作しました 💪

ただし、Surya 公式の推奨は「`RECOGNITION_BATCH_SIZE=512` で約 20GB VRAM 必要」とのこと。16GB でデフォルトが通ったのは**画像サイズが小さかったから**かもしれません。

大きな画像や PDF を処理する場合は、環境変数でバッチサイズを調整してね：

```
# バッチサイズを下げて VRAM 節約
set RECOGNITION_BATCH_SIZE=64
set DETECTION_BATCH_SIZE=8
```

---

## GitHub Copilot × OCR 自動化 🤖

せっかく Surya を調べたので、**GitHub Copilot のエージェントスキル**として公開しました！

### ocr-super-surya スキル

GitHub Copilot（Agent Mode）から OCR を呼び出せるスキルです。

- **OOM 自動リトライ機能**：VRAM 不足時にバッチサイズを自動調整
- **画像 / PDF / バッチ処理対応**
- **Verbose ログ出力**：デバッグしやすい

### インストール方法

```
# Agent-Skills リポジトリからコピー
git clone https://github.com/aktsmm/Agent-Skills
cp -r Agent-Skills/ocr-super-surya .github/skills/
```

### 使い方

Copilot Chat で：

```
@workspace スクリーンショットから文字を抽出して
```

スキルが自動で Surya を呼び出して OCR してくれます ✨

詳細は Agent-Skills リポジトリを見てね：

---

## PaddleOCR も知っておこう

Surya がシンプルさで最強なら、**PaddleOCR** は機能性で最強！

### PaddleOCR の強み

- **PDF → Markdown 変換**（レイアウト保持）
- **表・数式・チャート解析**
- **109 言語対応**
- **Apache 2.0 ライセンス**（完全商用利用 OK）

### 使い方

```
from paddleocr import PaddleOCR

ocr = PaddleOCR(
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False
)
result = ocr.predict(input="document.pdf")
```

### 注意点

- **PaddlePaddle フレームワーク**が必要でセットアップがやや複雑
- PyTorch ユーザーには Surya のほうが馴染みやすい

---

## どっちを選ぶ？

|用途|おすすめ|
|---|---|
|手軽に画像 OCR したい|**Surya** 🏆|
|PDF の構造ごと抽出したい|**PaddleOCR**|
|商用利用でライセンスリスク避けたい|**PaddleOCR** 👔|
|両方の長所を活かしたい|**併用** 🤝|

私のおすすめは、**普段使いは Surya**、複雑なドキュメント処理は PaddleOCR という使い分け！

---

## ライセンス注意！

### Surya

- 個人・研究用途：**無料**
- 商用利用：**年間収益 $2M 以下なら無料**、それ以上は追加ライセンス

### PaddleOCR

- **Apache 2.0**：完全無料、商用 OK

ビジネスで使うなら、この差は結構重要かも 💰

---

## まとめ

|項目|Tesseract|Surya|PaddleOCR|
|---|---|---|---|
|GPU 対応|×|○|○|
|精度|良|最高 🏆|最高|
|導入|普通|超簡単 🎉|やや複雑|
|PDF 対応|限定的|別ツール|ネイティブ|
|商用|自由|条件付き|完全自由|

**2026 年の OCR は選択肢が広がった！** 用途に合わせて最適なツールを選んでみてね〜🎓