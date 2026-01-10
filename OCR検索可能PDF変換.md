[【Python】そうだ、スキャンPDFをOCRして検索可能PDFに変換しよう](https://zenn.dev/harumikun/articles/92f938789a86de)

---

### [](https://zenn.dev/harumikun/articles/92f938789a86de#%E5%BF%85%E8%A6%81%E3%83%91%E3%83%83%E3%82%B1%E3%83%BC%E3%82%B8%E3%81%AE%E3%82%A4%E3%83%B3%E3%82%B9%E3%83%88%E3%83%BC%E3%83%AB)必要パッケージのインストール

パッケージマネージャーには`uv`を使用していきます。

bash

```bash
uv init
uv add numpy opencv-python pypdf pypdfium2 reportlab onnxocr
```

pipの場合

```bash
pip install numpy opencv-python pypdf pypdfium2 reportlab onnxocr
```

| ライブラリ     | 目的                  |
| --------- | ------------------- |
| numpy     | OCRの前処理             |
| OpenCV    | OCRの前処理             |
| pypdf     | 元のPDFへオーバーレイPDFを合成  |
| pypdfium2 | PDFページを画像としてレンダリング  |
| reportlab | テキストレイヤーを描画したPDFを作成 |
| OnnxOCR   | CPU推論で高速OCR処理       |

### [](https://zenn.dev/harumikun/articles/92f938789a86de#%E5%85%A8%E4%BD%93%E3%83%95%E3%83%AD%E3%83%BC)全体フロー

処理の概念図は以下の通りです。

各ステップを分解して、**簡単なサンプルコード**で説明していきます。

### [](https://zenn.dev/harumikun/articles/92f938789a86de#1.-pdf%E3%83%9A%E3%83%BC%E3%82%B8%E3%82%92%E7%94%BB%E5%83%8F%EF%BC%88pil-image%EF%BC%89%E3%81%A8%E3%81%97%E3%81%A6%E5%8F%96%E3%82%8A%E5%87%BA%E3%81%99)1. PDFページを画像（PIL Image）として取り出す

OCRを行うには PDF を画像に変換する必要があります。  
ここで使うのが **pypdfium2** です。

main.py

```python
import pypdfium2 as pdfium

def render_pdf_to_image(pdf_path, dpi=300):
    pdf = pdfium.PdfDocument(pdf_path)
    page = pdf[0]  # 例：最初の1ページのみ
    scale = dpi / 72
    pil_img = page.render(scale=scale).to_pil()
    return pil_img
```

**ポイント**

- PDFは72dpiベース → OCRのために300dpi前後へスケールアップ
    
- `to_pil()`でPillow画像になるので、OpenCVやnumpyで扱える
    

### [](https://zenn.dev/harumikun/articles/92f938789a86de#2.-ocr%E3%81%AE%E5%AE%9F%E8%A1%8C)2. OCRの実行

別記事にて紹介したOnnxOCRを使ってPDF画像をOCRしていきます。

main.py

```python
import numpy as np
import cv2
from onnxocr.onnx_paddleocr import ONNXPaddleOcr

ocr = ONNXPaddleOcr(use_gpu=False, lang="japan")

def run_ocr(pil_img):
    rgb = np.array(pil_img)
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    results = ocr.ocr(bgr)
    return results

```

OnnxOCRの実行結果は以下のようなデータが格納されています

bash

```bash
[
  [
    [[x1,y1], [x2,y2], [x3,y3], [x4,y4]], ["文字列", 信頼度]
  ],
  ...
]
```

### [](https://zenn.dev/harumikun/articles/92f938789a86de#3.-ocr%E7%B5%90%E6%9E%9C%E3%82%92%E2%80%9C%E7%9F%A9%E5%BD%A2%EF%BC%8B%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88%E2%80%9D%E3%81%AB%E6%AD%A3%E8%A6%8F%E5%8C%96%E3%81%99%E3%82%8B)3. OCR結果を“矩形＋テキスト”に正規化する

こちらの処理は無くても問題ありませんが、OCR結果は4点の四角形（クアッド）ですが、PDFに文字を押し込むためには  
**単純な矩形（x1,y1,x2,y2）**が扱いやすいです。後の処理のためにデータを扱いやすくしておきます。

main.py

```python
def normalize_ocr_results(ocr_results):
    items = []
    for line in ocr_results[0]:
        quad = line[0]
        text = line[1][0]
        xs = [p[0] for p in quad]
        ys = [p[1] for p in quad]
        items.append({
            "text": text,
            "bbox": (min(xs), min(ys), max(xs), max(ys)),
        })
    return items

```

### [](https://zenn.dev/harumikun/articles/92f938789a86de#4.-reportlab%E3%81%A7%E3%80%8C%E9%80%8F%E6%98%8E%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88%E3%83%AC%E3%82%A4%E3%83%A4%E3%83%BCpdf%E3%80%8D%E3%82%92%E4%BD%9C%E3%82%8B)4. ReportLabで「透明テキストレイヤーPDF」を作る

ここがいちばん重要な部分です。

OCRで得た文字位置へ、**透明文字（Invisible Text）** を配置し、元PDFに合成すると、“検索可能PDF”になります。

main.py

```python
import io
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont

pdfmetrics.registerFont(UnicodeCIDFont("HeiseiKakuGo-W5"))  # 日本語フォント

def create_overlay_pdf(page_w, page_h, ocr_items):
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(page_w, page_h))
    c.setFillAlpha(0.0)  # 完全透明

    for item in ocr_items:
        x1, y1, x2, y2 = item["bbox"]
        text = item["text"]

        fontsize = max(6, (y2 - y1) * 0.9)
        c.setFont("HeiseiKakuGo-W5", fontsize)

        # PDF座標は左下原点なので上下を反転
        baseline_y = page_h - y2
        c.drawString(x1, baseline_y, text)

    c.save()
    return buf.getvalue()

```

**ポイント**

- `setFillAlpha(0.0)` で透明化する
    
- OCR座標は**画像座標（上が0）** → PDFは**下が0** → 上下反転が必要
    
- y座標は `page_h - y2`
    


`reportlab` はデフォルトでは日本語などを扱えないため、日本語対応フォントを設定しておく必要があります。  
ちゃんと使うなら別途日本語対応フォントを用意して読み込んだほうがいいかも

```py
pdfmetrics.registerFont(UnicodeCIDFont("HeiseiKakuGo-W5"))
```

### [](https://zenn.dev/harumikun/articles/92f938789a86de#5.-pypdf%E3%81%A7%E5%85%83pdf%E3%81%A8%E3%82%AA%E3%83%BC%E3%83%90%E3%83%BC%E3%83%AC%E3%82%A4pdf%E3%82%92%E5%90%88%E4%BD%93%E3%81%99%E3%82%8B)5. PyPDFで元PDFとオーバーレイPDFを合体する

最後の仕上げです。作成した透明文字のPDFオーバーレイを元のPDFに合体させればいい感じにテキスト埋込PDFの生成完了です。

main.py

```python
from pypdf import PdfReader, PdfWriter

def merge_overlay(original_pdf, overlay_bytes, output_pdf):
    reader = PdfReader(original_pdf)
    overlay_reader = PdfReader(io.BytesIO(overlay_bytes))

    writer = PdfWriter()

    page = reader.pages[0]
    overlay_page = overlay_reader.pages[0]

    page.merge_page(overlay_page)
    writer.add_page(page)

    with open(output_pdf, "wb") as f:
        writer.write(f)

```
