// 座標変換ユーティリティ

/**
 * 画像座標（上が0）をPDF座標（下が0）に変換
 * @param {Object} imageBbox - 画像バウンディングボックス { x1, y1, x2, y2 }
 * @param {number} imageHeight - 画像の高さ（ピクセル）
 * @param {number} pdfHeight - PDFページの高さ（ポイント）
 * @param {number} [imageWidth] - 画像の幅（ピクセル）。省略時はimageHeightと同じ比率を適用
 * @param {number} [pdfWidth] - PDFページの幅（ポイント）。省略時はpdfHeightと同じ比率を適用
 * @returns {Object} - PDF座標 { x, y, width, height }
 */
export function convertImageCoordsToPDF(imageBbox, imageHeight, pdfHeight, imageWidth, pdfWidth) {
  const { x1, y1, x2, y2 } = imageBbox;
  
  // スケール計算（X軸とY軸で異なる場合に対応）
  const scaleY = pdfHeight / imageHeight;
  const scaleX = (imageWidth && pdfWidth) ? (pdfWidth / imageWidth) : scaleY;
  
  // PDF座標系（下が原点）に変換
  return {
    x: x1 * scaleX,
    y: pdfHeight - (y2 * scaleY),  // Y軸反転
    width: (x2 - x1) * scaleX,
    height: (y2 - y1) * scaleY,
  };
}

/**
 * バウンディングボックスの高さからフォントサイズを計算
 * @param {Object|number} bbox - バウンディングボックス { height } またはheight値
 * @param {number} [minFontSize] - 最小フォントサイズ（デフォルト: 6）
 * @returns {number} - 計算されたフォントサイズ
 */
export function calculateFontSize(bbox, minFontSize = 6) {
  const height = typeof bbox === 'number' ? bbox : bbox?.height;
  if (height === undefined || height === null || isNaN(height)) return minFontSize;
  if (height === 0) return minFontSize;
  return Math.max(minFontSize, height * 0.9);
}

/**
 * OCRアイテムをPDF座標系のテキストレイヤーアイテムに変換
 * @param {Object} ocrItem - OCRアイテム { text, bbox, confidence }
 * @param {number} imageHeight - 画像の高さ
 * @param {number} pdfHeight - PDFページの高さ
 * @param {number} [imageWidth] - 画像の幅
 * @param {number} [pdfWidth] - PDFページの幅
 * @returns {Object} - テキストレイヤーアイテム { text, x, y, width, height, fontSize, fontName, confidence }
 */
export function convertOCRItemToTextLayerItem(ocrItem, imageHeight, pdfHeight, imageWidth, pdfWidth) {
  const pdfCoords = convertImageCoordsToPDF(ocrItem.bbox, imageHeight, pdfHeight, imageWidth, pdfWidth);
  const fontSize = calculateFontSize(pdfCoords.height);
  
  return {
    text: ocrItem.text,
    x: pdfCoords.x,
    y: pdfCoords.y,
    width: pdfCoords.width,
    height: pdfCoords.height,
    fontSize,
    fontName: 'HeiseiKakuGo-W5',
    confidence: ocrItem.confidence,
  };
}
