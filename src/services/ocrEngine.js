// OCRエンジンサービス（Tesseract.jsラッパー）
import { createWorker } from 'tesseract.js';

/**
 * OCR Workerを初期化
 * @param {string} lang - 言語（デフォルト: jpn）
 * @returns {Promise<Worker>} - Tesseract Worker
 */
export async function initializeWorker(lang = 'jpn') {
  try {
    const worker = await createWorker(lang, 1, {
      workerPath: '/assets/wasm/worker.min.js',
      langPath: '/assets/wasm',
      corePath: '/assets/wasm',
    });
    
    return worker;
  } catch (error) {
    throw new Error('OCR Worker initialization failed: ' + error.message);
  }
}

/**
 * OCR処理を実行
 * @param {ImageData} imageData - 画像データ
 * @param {number} pageNumber - ページ番号
 * @param {Worker} worker - Tesseract Worker（オプション）
 * @returns {Promise<Object>} - OCRResult { pageNumber, items, confidence }
 */
export async function performOCR(imageData, pageNumber, worker = null) {
  let localWorker = worker;
  let shouldTerminate = false;
  
  try {
    // Worker未提供の場合は新規作成
    if (!localWorker) {
      localWorker = await initializeWorker();
      shouldTerminate = true;
    }
    
    // OCR実行
    const { data } = await localWorker.recognize(imageData);
    
    // 結果フォーマット
    const ocrResult = {
      pageNumber,
      items: data.words.map(word => ({
        text: word.text,
        bbox: {
          x1: word.bbox.x0,
          y1: word.bbox.y0,
          x2: word.bbox.x1,
          y2: word.bbox.y1,
        },
        confidence: word.confidence / 100,
      })),
      confidence: data.confidence / 100,
      imageHeight: imageData.height,
    };
    
    return ocrResult;
  } catch (error) {
    throw new Error(`OCR processing failed for page ${pageNumber}: ` + error.message);
  } finally {
    // 作成したWorkerは終了
    if (shouldTerminate && localWorker) {
      await localWorker.terminate();
    }
  }
}
