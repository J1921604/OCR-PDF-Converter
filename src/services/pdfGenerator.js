// PDF生成サービス（pdf-libラッパー）
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { convertOCRItemToTextLayerItem } from '../utils/coordinateConverter';

/**
 * OCR結果からテキストレイヤーを生成
 * @param {Object} ocrResult - OCRResult { pageNumber, items, confidence, imageHeight }
 * @param {number} pdfHeight - PDFページの高さ（ポイント）
 * @returns {Array} - TextLayerItem[]
 */
export function createTextLayer(ocrResult, pdfHeight) {
  return ocrResult.items.map(item => 
    convertOCRItemToTextLayerItem(item, ocrResult.imageHeight, pdfHeight)
  );
}

/**
 * 元のPDFに透明テキストレイヤーを追加
 * @param {Blob|ArrayBuffer} originalPDF - 元のPDFファイル
 * @param {Array} textLayers - TextLayer配列 [{ pageNumber, items }]
 * @returns {Promise<Blob>} - 検索可能PDF
 */
export async function addTextLayerToPDF(originalPDF, textLayers) {
  try {
    // 元のPDFを読み込み
    const arrayBuffer = originalPDF instanceof Blob 
      ? await originalPDF.arrayBuffer() 
      : originalPDF;
    
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    // フォント登録（暫定: Helvetica、日本語フォントは外部から読み込み必要）
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // 各ページにテキストレイヤーを追加
    for (const textLayer of textLayers) {
      const pageIndex = textLayer.pageNumber - 1;
      const page = pdfDoc.getPage(pageIndex);
      
      for (const item of textLayer.items) {
        // 透明テキスト描画
        page.drawText(item.text, {
          x: item.x,
          y: item.y,
          size: item.fontSize,
          font: font,
          color: rgb(0, 0, 0),
          opacity: 0.0,  // 完全透明
        });
      }
    }
    
    // PDF出力
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  } catch (error) {
    throw new Error('PDF generation failed: ' + error.message);
  }
}

/**
 * 画像ファイルをPDFに変換
 * @param {File} imageFile - 画像ファイル（JPEG/PNG/TIFF）
 * @returns {Promise<Blob>} - PDF Blob
 */
export async function convertImageToPDF(imageFile) {
  try {
    const pdfDoc = await PDFDocument.create();
    
    // 画像読み込み
    const arrayBuffer = await imageFile.arrayBuffer();
    let image;
    
    if (imageFile.type === 'image/jpeg') {
      image = await pdfDoc.embedJpg(arrayBuffer);
    } else if (imageFile.type === 'image/png') {
      image = await pdfDoc.embedPng(arrayBuffer);
    } else {
      throw new Error('Unsupported image format: ' + imageFile.type);
    }
    
    // ページ作成（画像サイズに合わせる）
    const page = pdfDoc.addPage([image.width, image.height]);
    
    // 画像を描画
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
    
    // PDF出力
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  } catch (error) {
    throw new Error('Image to PDF conversion failed: ' + error.message);
  }
}
