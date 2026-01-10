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
      // worker/coreはビルド成果物へ同梱して配信（webpack.config.js の CopyWebpackPlugin で配置）
      workerPath: '/assets/wasm/worker.min.js',
      // 言語データは公式配布先を利用（jpn.traineddata の巨大ファイルをリポジトリに同梱しない方針）
      // 例: https://tessdata.projectnaptha.com/4.0.0/jpn.traineddata.gz
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      // corePathは *.wasm.js を明示
      corePath: '/assets/wasm/tesseract-core.wasm.js',
    });
    
    return worker;
  } catch (error) {
    throw new Error('OCR Worker initialization failed: ' + error.message);
  }
}

/**
 * OCR処理を実行
 * @param {HTMLCanvasElement|ImageData} imageSource - 画像データ（CanvasまたはImageData）
 * @param {number} pageNumber - ページ番号
 * @param {Worker} worker - Tesseract Worker（オプション）
 * @returns {Promise<Object>} - OCRResult { pageNumber, items, confidence }
 */
export async function performOCR(imageSource, pageNumber, worker = null) {
  let localWorker = worker;
  let shouldTerminate = false;
  
  try {
    // Worker未提供の場合は新規作成
    if (!localWorker) {
      localWorker = await initializeWorker();
      shouldTerminate = true;
    }
    
    console.log('[ocrEngine] OCR処理開始 - ページ', pageNumber, 'Image type:', imageSource.constructor.name);
    
    // OCR実行（CanvasまたはImageDataを渡す）
    const { data } = await localWorker.recognize(imageSource);
    
    // 結果フォーマット & フィルタリング
    const MIN_CONFIDENCE = 0.5; // 最小信頼度閾値
    
    const filteredWords = data.words
      .filter(word => {
        // 空のテキストまたは空白のみのテキストを除外
        if (!word.text || word.text.trim() === '') {
          return false;
        }
        // 信頼度が閾値未満の単語を除外
        if (word.confidence < MIN_CONFIDENCE * 100) {
          return false;
        }
        return true;
      })
      .map(word => ({
        text: word.text,
        bbox: {
          x1: word.bbox.x0,
          y1: word.bbox.y0,
          x2: word.bbox.x1,
          y2: word.bbox.y1,
        },
        confidence: word.confidence / 100,
      }));
    
    const imageHeight = imageSource.height || (imageSource.canvas && imageSource.canvas.height) || 0;
    
    const ocrResult = {
      pageNumber,
      items: filteredWords,
      confidence: data.confidence / 100,
      imageHeight: imageHeight,
    };
    
    console.log('[ocrEngine] OCR完了 - ページ', pageNumber, '単語数:', filteredWords.length, '信頼度:', (data.confidence / 100).toFixed(2));
    
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
