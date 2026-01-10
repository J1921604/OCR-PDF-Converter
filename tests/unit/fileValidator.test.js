/**
 * fileValidator.test.js - ファイル検証ユーティリティのテスト
 */

import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB,
  validateMimeType,
  validateFileSize,
  isImageFile,
  isPDFFile,
  validateFile,
} from '../../src/utils/fileValidator';

describe('fileValidator', () => {
  describe('validateMimeType', () => {
    test('許可されたPDFファイルはtrueを返す', () => {
      expect(validateMimeType('application/pdf')).toBe(true);
    });

    test('許可されたJPEGファイルはtrueを返す', () => {
      expect(validateMimeType('image/jpeg')).toBe(true);
    });

    test('許可されたPNGファイルはtrueを返す', () => {
      expect(validateMimeType('image/png')).toBe(true);
    });

    test('許可されたTIFFファイルはtrueを返す', () => {
      expect(validateMimeType('image/tiff')).toBe(true);
    });

    test('許可されていないファイルはfalseを返す', () => {
      expect(validateMimeType('application/zip')).toBe(false);
    });

    test('空文字列はfalseを返す', () => {
      expect(validateMimeType('')).toBe(false);
    });

    test('undefinedはfalseを返す', () => {
      expect(validateMimeType(undefined)).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    test('最大サイズ以下のファイルはtrueを返す', () => {
      expect(validateFileSize(5 * 1024 * 1024)).toBe(true); // 5MB
    });

    test('最大サイズちょうどのファイルはtrueを返す', () => {
      expect(validateFileSize(MAX_FILE_SIZE)).toBe(true);
    });

    test('最大サイズを超えるファイルはfalseを返す', () => {
      expect(validateFileSize(MAX_FILE_SIZE + 1)).toBe(false);
    });

    test('0バイトのファイルはtrueを返す', () => {
      expect(validateFileSize(0)).toBe(true);
    });
  });

  describe('isImageFile', () => {
    test('JPEGファイルはtrueを返す', () => {
      expect(isImageFile('image/jpeg')).toBe(true);
    });

    test('PNGファイルはtrueを返す', () => {
      expect(isImageFile('image/png')).toBe(true);
    });

    test('TIFFファイルはtrueを返す', () => {
      expect(isImageFile('image/tiff')).toBe(true);
    });

    test('PDFファイルはfalseを返す', () => {
      expect(isImageFile('application/pdf')).toBe(false);
    });

    test('その他のファイルはfalseを返す', () => {
      expect(isImageFile('text/plain')).toBe(false);
    });
  });

  describe('isPDFFile', () => {
    test('PDFファイルはtrueを返す', () => {
      expect(isPDFFile('application/pdf')).toBe(true);
    });

    test('JPEGファイルはfalseを返す', () => {
      expect(isPDFFile('image/jpeg')).toBe(false);
    });

    test('その他のファイルはfalseを返す', () => {
      expect(isPDFFile('text/plain')).toBe(false);
    });
  });

  describe('validateFile', () => {
    test('有効なPDFファイルは成功を返す', () => {
      const result = validateFile('application/pdf', 5 * 1024 * 1024);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('有効なJPEGファイルは成功を返す', () => {
      const result = validateFile('image/jpeg', 3 * 1024 * 1024);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('無効なMIMEタイプはエラーを返す', () => {
      const result = validateFile('application/zip', 5 * 1024 * 1024);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `サポートされていないファイル形式です。対応形式: PDF、JPEG、PNG、TIFF`
      );
    });

    test('サイズ超過はエラーを返す', () => {
      const result = validateFile('application/pdf', MAX_FILE_SIZE + 1);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `ファイルサイズが大きすぎます。最大${MAX_FILE_SIZE_MB}MBまでです。`
      );
    });

    test('複数のエラーを同時に返す', () => {
      const result = validateFile('application/zip', MAX_FILE_SIZE + 1);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('定数', () => {
    test('ALLOWED_MIME_TYPESが正しく定義されている', () => {
      expect(ALLOWED_MIME_TYPES).toContain('application/pdf');
      expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
      expect(ALLOWED_MIME_TYPES).toContain('image/png');
      expect(ALLOWED_MIME_TYPES).toContain('image/tiff');
      expect(ALLOWED_MIME_TYPES).toHaveLength(4);
    });

    test('MAX_FILE_SIZEが10MBである', () => {
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });

    test('MAX_FILE_SIZE_MBが10である', () => {
      expect(MAX_FILE_SIZE_MB).toBe(10);
    });
  });
});
