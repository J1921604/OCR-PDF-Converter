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
 * テキストからWinAnsiでエンコード不可能な文字を除去
 * @param {string} text - 元のテキスト
 * @returns {string} - エンコード可能な文字のみのテキスト
 */
function sanitizeTextForWinAnsi(text) {
  // WinAnsiでエンコード可能な文字のみを残す（0x20-0x7E, 0xA0-0xFF）
  return text.split('').filter(char => {
    const code = char.charCodeAt(0);
    return (code >= 0x20 && code <= 0x7E) || (code >= 0xA0 && code <= 0xFF);
  }).join('');
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
    
    console.log('[pdfGenerator] テキストレイヤー追加開始, ページ数:', textLayers.length);
    
    let totalItems = 0;
    let skippedItems = 0;
    
    // 各ページにテキストレイヤーを追加
    for (const textLayer of textLayers) {
      const pageIndex = textLayer.pageNumber - 1;
      const page = pdfDoc.getPage(pageIndex);
      
      for (const item of textLayer.items) {
        totalItems++;
        
        // WinAnsiでエンコード不可能な文字を除去
        const sanitizedText = sanitizeTextForWinAnsi(item.text);
        
        if (!sanitizedText || sanitizedText.trim() === '') {
          skippedItems++;
          continue; // エンコード不可能なテキストはスキップ
        }
        
        try {
          // 透明テキスト描画
          page.drawText(sanitizedText, {
            x: item.x,
            y: item.y,
            size: item.fontSize,
            font: font,
            color: rgb(0, 0, 0),
            opacity: 0.0,  // 完全透明
          });
        } catch (err) {
          // 個別のテキスト描画エラーはスキップ
          console.warn('[pdfGenerator] テキスト描画スキップ:', sanitizedText, err.message);
          skippedItems++;
        }
      }
    }
    
    console.log('[pdfGenerator] テキストレイヤー追加完了, 総アイテム:', totalItems, 'スキップ:', skippedItems);
    
    // PDF出力
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  } catch (error) {
    throw new Error('PDF generation failed: ' + error.message);
  }
}

/**
 * 画像ファイルをPDFに変換
 * @param {ArrayBuffer|File} imageData - 画像データ（ArrayBufferまたはFile）
 * @param {string} [mimeType] - 画像のMIMEタイプ（imageDataがArrayBufferの場合に指定）
 * @returns {Promise<Blob>} - PDF Blob
 */
export async function convertImageToPDF(imageData, mimeType) {
  try {
    const pdfDoc = await PDFDocument.create();
    
    // ArrayBufferとMIMEタイプの取得
    let arrayBuffer;
    let type;
    
    if (imageData instanceof File) {
      arrayBuffer = await imageData.arrayBuffer();
      type = imageData.type;
    } else {
      arrayBuffer = imageData;
      type = mimeType;
    }
    
    if (!type) {
      throw new Error('MIME type is required when imageData is ArrayBuffer');
    }
    
    // 画像埋め込み
    let image;
    
    if (type === 'image/jpeg') {
      image = await pdfDoc.embedJpg(arrayBuffer);
    } else if (type === 'image/png') {
      image = await pdfDoc.embedPng(arrayBuffer);
    } else if (type === 'image/tiff') {
      // TIFFは直接サポートされていないため、PNGに変換済みと想定
      throw new Error('サポートされていない画像形式: TIFF。PNGに変換してください。');
    } else {
      throw new Error('サポートされていない画像形式: ' + type);
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
