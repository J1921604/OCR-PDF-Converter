// エラーハンドリングユーティリティ

/**
 * OCRエラークラス
 */
export class OCRError extends Error {
  constructor(message, pageNumber, originalError) {
    super(message);
    this.name = 'OCRError';
    this.pageNumber = pageNumber;
    this.originalError = originalError;
  }
}

/**
 * ファイル検証エラークラス
 */
export class ValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * OCRエラーをハンドリング
 * @param {Error} error - 元のエラー
 * @param {number} [pageNumber] - ページ番号
 * @returns {OCRError} - OCRエラー
 */
export function handleOCRError(error, pageNumber) {
  // 既にOCRErrorの場合はそのまま返す
  if (error instanceof OCRError) {
    return error;
  }
  
  // OCRErrorに変換
  let message = error.message || 'OCR処理に失敗しました';
  
  if (error.message && error.message.includes('timeout')) {
    message = `ページ${pageNumber}のOCR処理がタイムアウトしました`;
  } else if (error.message && error.message.includes('out of memory')) {
    message = 'メモリ不足: ファイルサイズを小さくしてください';
  } else if (pageNumber !== undefined) {
    message = `ページ${pageNumber}のOCR処理に失敗しました`;
  }
  
  return new OCRError(message, pageNumber, error);
}

/**
 * ユーザーフレンドリーなエラーメッセージを生成
 * @param {Error} error - エラーオブジェクト
 * @returns {string} - ユーザー向けエラーメッセージ
 */
export function getUserFriendlyErrorMessage(error) {
  if (error instanceof ValidationError) {
    return error.errors.join('\n');
  }
  
  if (error instanceof OCRError) {
    const prefix = error.pageNumber !== undefined ? `ページ${error.pageNumber}: ` : '';
    return prefix + error.message;
  }
  
  if (error.name === 'PDFLoadError') {
    return 'PDFファイルが破損しています';
  }
  
  // 通常のErrorの場合
  if (error instanceof Error && error.message) {
    return error.message;
  }
  
  return '予期しないエラーが発生しました: ' + JSON.stringify(error);
}
