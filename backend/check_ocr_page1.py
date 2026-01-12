"""開発用: 実PDFの1ページ目で各OCRエンジンが検出できているかを確認する。"""

import os

from main import render_pdf_to_image, run_ocr, normalize_ocr_results


def main():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    pdf_path = os.path.join(root, '.specify', 'memory', 'constitution.pdf')
    print('pdf_path:', pdf_path)
    print('rendering page 1...')
    pil_img, _, _ = render_pdf_to_image(pdf_path, 0, dpi=300)
    print('rendered.')

    for eng in ['onnxocr', 'paddleocr']:
        print('\n===', eng, '===')
        try:
            print('running ocr...')
            res = run_ocr(pil_img, eng)
            print('ocr done. normalizing...')
            items = normalize_ocr_results(res, confidence_threshold=0.0)
            print('items:', len(items))
            if items:
                print('sample_conf:', items[0]['confidence'])
                print('sample_text:', items[0]['text'][:80])
        except KeyboardInterrupt:
            raise
        except Exception as e:
            print('error:', repr(e))


if __name__ == '__main__':
    main()
