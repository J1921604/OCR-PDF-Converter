// 座標変換ユーティリティ

/**
 * 画像座標（上が0）をPDF座標（下が0）に変換
 * @param {Object} imageBbox - 画像バウンディングボックス { x1, y1, x2, y2 }
 * @param {number} imageHeight - 画像の高さ（ピクセル）
 * @param {number} pdfHeight - PDFページの高さ（ポイント）
 * @returns {Object} - PDF座標 { x, y, width, height }
 */
export function convertImageCoordsToPDF(imageBbox, imageHeight, pdfHeight) {
  const { x1, y1, x2, y2 } = imageBbox;
  
  // Y軸のスケール計算
  const scaleY = pdfHeight / imageHeight;
  
  // PDF座標系（下が原点）に変換
  return {
    x: x1,
    y: pdfHeight - (y2 * scaleY),  // Y軸反転
    width: x2 - x1,
    height: (y2 - y1) * scaleY,
  };
}

/**
 * バウンディングボックスの高さからフォントサイズを計算
 * @param {number} bboxHeight - バウンディングボックスの高さ（ピクセル）
 * @param {number} minFontSize - 最小フォントサイズ（デフォルト: 6）
 * @returns {number} - 計算されたフォントサイズ
 */
export function calculateFontSize(bboxHeight, minFontSize = 6) {
  return Math.max(minFontSize, bboxHeight * 0.9);
}

/**
 * OCRアイテムをPDF座標系のテキストレイヤーアイテムに変換
 * @param {Object} ocrItem - OCRアイテム { text, bbox, confidence }
 * @param {number} imageHeight - 画像の高さ
 * @param {number} pdfHeight - PDFページの高さ
 * @returns {Object} - テキストレイヤーアイテム { text, x, y, fontSize, fontName }
 */
export function convertOCRItemToTextLayerItem(ocrItem, imageHeight, pdfHeight) {
  const pdfCoords = convertImageCoordsToPDF(ocrItem.bbox, imageHeight, pdfHeight);
  const fontSize = calculateFontSize(pdfCoords.height);
  
  return {
    text: ocrItem.text,
    x: pdfCoords.x,
    y: pdfCoords.y,
    fontSize,
    fontName: 'HeiseiKakuGo-W5',
  };
}
