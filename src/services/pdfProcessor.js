// PDF処理サービス（PDF.jsラッパー）
import * as pdfjsLib from 'pdfjs-dist';

// Worker設定 - ローカル配信（CDN依存やCSP/拡張機能ブロックを回避）
// GitHub Pagesのサブパス配信も想定し、document.baseURI基準で解決する
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdf.worker.min.mjs',
  document.baseURI
).toString();

/**
 * PDFファイルを読み込み
 * @param {File|Blob} file - PDFファイル
 * @returns {Promise<Object>} - { pdf, pageCount }
 */
export async function loadPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    return {
      pdf,
      pageCount: pdf.numPages,
    };
  } catch (error) {
    throw new Error('PDFLoading failed: ' + error.message);
  }
}

/**
 * PDFページを画像に変換（300dpi）
 * @param {Object} pdf - PDFドキュメント
 * @param {number} pageNumber - ページ番号（1始まり）
 * @param {number} dpi - 解像度（デフォルト: 300）
 * @returns {Promise<Object>} - { imageData, width, height }
 */
export async function renderPageToImage(pdf, pageNumber, dpi = 300) {
  try {
    const page = await pdf.getPage(pageNumber);
    
    // 300dpiでレンダリング（デフォルト72dpi）
    const scale = dpi / 72;
    const viewport = page.getViewport({ scale });
    
    // Canvas作成
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // レンダリング実行
    await page.render({ canvasContext: context, viewport }).promise;
    
    // ImageData取得
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    return {
      imageData,
      width: canvas.width,
      height: canvas.height,
    };
  } catch (error) {
    throw new Error(`Page ${pageNumber} rendering failed: ` + error.message);
  }
}

/**
 * ページサイズを取得
 * @param {Object} pdf - PDFドキュメント
 * @param {number} pageNumber - ページ番号（1始まり）
 * @returns {Promise<Object>} - { width, height } (ポイント単位)
 */
export async function getPageSize(pdf, pageNumber) {
  try {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.0 });
    
    return {
      width: viewport.width,
      height: viewport.height,
    };
  } catch (error) {
    throw new Error(`Page ${pageNumber} size detection failed: ` + error.message);
  }
}
