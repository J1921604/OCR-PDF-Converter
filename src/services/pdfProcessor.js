// PDF処理サービス（PDF.jsラッパー）
import * as pdfjsLib from 'pdfjs-dist';

// Worker設定 - ローカル配信
// CDNを使わず、ビルド時にコピーしたローカルのworkerファイルを使用する
// webpack.config.jsのCopyWebpackPluginで 'pdf.worker.min.mjs' をルートに配置している前提
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
console.log('[pdfProcessor] Worker path set to:', pdfjsLib.GlobalWorkerOptions.workerSrc);

/**
 * PDFファイルを読み込み
 * @param {File|Blob} file - PDFファイル
 * @returns {Promise<Object>} - { pdf, pageCount }
 */
export async function loadPDF(file) {
  try {
    console.log('[pdfProcessor] Loading PDF:', file.name, 'Size:', file.size);
    const arrayBuffer = await file.arrayBuffer();
    console.log('[pdfProcessor] ArrayBuffer created, size:', arrayBuffer.byteLength);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log('[pdfProcessor] PDF loaded successfully, pages:', pdf.numPages);
    
    return {
      pdf,
      pageCount: pdf.numPages,
    };
  } catch (error) {
    console.error('[pdfProcessor] PDF loading failed:', error);
    throw new Error('PDFLoading failed: ' + error.message);
  }
}

/**
 * PDFページを画像に変換（300dpi）
 * @param {Object} pdf - PDFドキュメント
 * @param {number} pageNumber - ページ番号（1始まり）
 * @param {number} dpi - 解像度（デフォルト: 300）
 * @returns {Promise<Object>} - { canvas, imageData, width, height }
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
    
    console.log('[pdfProcessor] ページ', pageNumber, 'レンダリング完了: ', canvas.width, 'x', canvas.height);
    
    return {
      canvas,
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
