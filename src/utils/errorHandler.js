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
 * @param {number} pageNumber - ページ番号
 * @returns {OCRError} - OCRエラー
 */
export function handleOCRError(error, pageNumber) {
  if (error.message.includes('timeout')) {
    return new OCRError(
      `ページ${pageNumber}のOCR処理がタイムアウトしました`,
      pageNumber,
      error
    );
  }
  
  if (error.message.includes('out of memory')) {
    return new OCRError(
      'メモリ不足: ファイルサイズを小さくしてください',
      pageNumber,
      error
    );
  }
  
  return new OCRError(
    `ページ${pageNumber}のOCR処理に失敗しました`,
    pageNumber,
    error
  );
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
    return error.message;
  }
  
  if (error.name === 'PDFLoadError') {
    return 'PDFファイルが破損しています';
  }
  
  return 'エラーが発生しました。再試行してください。';
}
