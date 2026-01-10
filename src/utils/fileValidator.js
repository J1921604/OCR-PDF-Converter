// ファイル検証ユーティリティ

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILE_SIZE_MB = 10;

// 後方互換性のためのエイリアス
export const ALLOWED_MIME_TYPES = SUPPORTED_MIME_TYPES;

/**
 * ファイルのMIMEタイプを検証
 * @param {File|string} file - 検証するファイルまたはMIME type文字列
 * @returns {boolean} - サポートされているMIMEタイプの場合true
 */
export function validateMimeType(file) {
  const mimeType = typeof file === 'string' ? file : file?.type;
  if (!mimeType) return false; // undefined, null, 空文字列をfalseとして扱う
  return SUPPORTED_MIME_TYPES.includes(mimeType);
}

/**
 * ファイルサイズを検証
 * @param {File|number} file - 検証するファイルまたはサイズ（バイト）
 * @returns {boolean} - 10MB以下の場合true
 */
export function validateFileSize(file) {
  const size = typeof file === 'number' ? file : file?.size;
  return size !== undefined && size <= MAX_FILE_SIZE;
}

/**
 * ファイル形式が画像かどうかを判定
 * @param {File|string} file - 判定するファイルまたはMIME type文字列
 * @returns {boolean} - 画像形式の場合true
 */
export function isImageFile(file) {
  const mimeType = typeof file === 'string' ? file : file?.type;
  return mimeType ? mimeType.startsWith('image/') : false;
}

/**
 * ファイル形式がPDFかどうかを判定
 * @param {File|string} file - 判定するファイルまたはMIME type文字列
 * @returns {boolean} - PDF形式の場合true
 */
export function isPDFFile(file) {
  const mimeType = typeof file === 'string' ? file : file?.type;
  return mimeType === 'application/pdf';
}

/**
 * ファイルを完全に検証
 * @param {File|string} fileOrMimeType - 検証するファイル、またはMIME type文字列（第2引数でサイズ指定時）
 * @param {number} [size] - ファイルサイズ（バイト）。fileOrMimeTypeが文字列の場合に使用
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export function validateFile(fileOrMimeType, size) {
  const errors = [];
  
  // 引数が2つの場合: (mimeType, size)
  // 引数が1つでFileオブジェクトの場合: (file)
  const mimeType = typeof fileOrMimeType === 'string' ? fileOrMimeType : fileOrMimeType?.type;
  const fileSize = size !== undefined ? size : fileOrMimeType?.size;

  if (!mimeType || !SUPPORTED_MIME_TYPES.includes(mimeType)) {
    errors.push(`サポートされていないファイル形式です。対応形式: PDF、JPEG、PNG、TIFF`);
  }

  if (fileSize === undefined || fileSize > MAX_FILE_SIZE) {
    errors.push(`ファイルサイズが大きすぎます。最大${MAX_FILE_SIZE_MB}MBまでです。`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
