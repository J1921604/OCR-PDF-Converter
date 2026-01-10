// ファイル検証ユーティリティ

const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * ファイルのMIMEタイプを検証
 * @param {File} file - 検証するファイル
 * @returns {boolean} - サポートされているMIMEタイプの場合true
 */
export function validateMimeType(file) {
  return SUPPORTED_MIME_TYPES.includes(file.type);
}

/**
 * ファイルサイズを検証
 * @param {File} file - 検証するファイル
 * @returns {boolean} - 10MB以下の場合true
 */
export function validateFileSize(file) {
  return file.size <= MAX_FILE_SIZE;
}

/**
 * ファイル形式が画像かどうかを判定
 * @param {File} file - 判定するファイル
 * @returns {boolean} - 画像形式の場合true
 */
export function isImageFile(file) {
  return file.type.startsWith('image/');
}

/**
 * ファイル形式がPDFかどうかを判定
 * @param {File} file - 判定するファイル
 * @returns {boolean} - PDF形式の場合true
 */
export function isPDFFile(file) {
  return file.type === 'application/pdf';
}

/**
 * ファイルを完全に検証
 * @param {File} file - 検証するファイル
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateFile(file) {
  const errors = [];

  if (!validateMimeType(file)) {
    errors.push('対応形式: PDF, JPEG, PNG, TIFFのみ');
  }

  if (!validateFileSize(file)) {
    errors.push('ファイルサイズは10MB以下にしてください');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
