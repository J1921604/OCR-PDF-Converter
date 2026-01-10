/**
 * errorHandler.test.js - エラー処理ユーティリティのテスト
 */

import {
  OCRError,
  ValidationError,
  handleOCRError,
  getUserFriendlyErrorMessage,
} from '../../src/utils/errorHandler';

describe('errorHandler', () => {
  describe('OCRError', () => {
    test('OCRErrorを作成できる', () => {
      const error = new OCRError('OCR処理エラー', 1);
      expect(error.message).toBe('OCR処理エラー');
      expect(error.pageNumber).toBe(1);
      expect(error.name).toBe('OCRError');
      expect(error instanceof Error).toBe(true);
    });

    test('ページ番号なしでOCRErrorを作成できる', () => {
      const error = new OCRError('OCR処理エラー');
      expect(error.message).toBe('OCR処理エラー');
      expect(error.pageNumber).toBeUndefined();
    });
  });

  describe('ValidationError', () => {
    test('ValidationErrorを作成できる', () => {
      const errors = ['エラー1', 'エラー2'];
      const error = new ValidationError('検証エラー', errors);
      expect(error.message).toBe('検証エラー');
      expect(error.errors).toEqual(errors);
      expect(error.name).toBe('ValidationError');
      expect(error instanceof Error).toBe(true);
    });

    test('空のエラー配列でValidationErrorを作成できる', () => {
      const error = new ValidationError('検証エラー', []);
      expect(error.errors).toEqual([]);
    });
  });

  describe('handleOCRError', () => {
    test('タイムアウトエラーを検出する', () => {
      const error = new Error('timeout exceeded');
      const result = handleOCRError(error, 1);

      expect(result).toBeInstanceOf(OCRError);
      expect(result.message).toContain('タイムアウトしました');
      expect(result.pageNumber).toBe(1);
    });

    test('メモリエラーを検出する', () => {
      const error = new Error('out of memory');
      const result = handleOCRError(error, 2);

      expect(result).toBeInstanceOf(OCRError);
      expect(result.message).toContain('メモリ不足');
      expect(result.pageNumber).toBe(2);
    });

    test('OCRErrorをそのまま返す', () => {
      const error = new OCRError('元のOCRエラー', 3);
      const result = handleOCRError(error, 3);

      expect(result).toBe(error);
      expect(result.message).toBe('元のOCRエラー');
    });

    test('通常のエラーをOCRErrorに変換する', () => {
      const error = new Error('通常のエラー');
      const result = handleOCRError(error, 4);

      expect(result).toBeInstanceOf(OCRError);
      expect(result.message).toContain('ページ4のOCR処理に失敗しました');
      expect(result.pageNumber).toBe(4);
      expect(result.originalError).toBe(error);
    });

    test('ページ番号なしでエラーを処理する', () => {
      const error = new Error('エラー');
      const result = handleOCRError(error);

      expect(result).toBeInstanceOf(OCRError);
      expect(result.pageNumber).toBeUndefined();
    });
  });

  describe('getUserFriendlyErrorMessage', () => {
    test('ValidationErrorから分かりやすいメッセージを取得する', () => {
      const error = new ValidationError('検証エラー', [
        'エラー1',
        'エラー2',
      ]);
      const message = getUserFriendlyErrorMessage(error);

      expect(message).toContain('エラー1');
      expect(message).toContain('エラー2');
    });

    test('単一エラーのValidationErrorからメッセージを取得する', () => {
      const error = new ValidationError('検証エラー', ['エラー1']);
      const message = getUserFriendlyErrorMessage(error);

      expect(message).toBe('エラー1');
    });

    test('ページ番号付きOCRErrorからメッセージを取得する', () => {
      const error = new OCRError('OCR処理エラー', 5);
      const message = getUserFriendlyErrorMessage(error);

      expect(message).toBe('ページ5: OCR処理エラー');
    });

    test('ページ番号なしOCRErrorからメッセージを取得する', () => {
      const error = new OCRError('OCR処理エラー');
      const message = getUserFriendlyErrorMessage(error);

      expect(message).toBe('OCR処理エラー');
    });

    test('通常のErrorからメッセージを取得する', () => {
      const error = new Error('通常のエラー');
      const message = getUserFriendlyErrorMessage(error);

      expect(message).toBe('通常のエラー');
    });

    test('メッセージなしのエラーから既定メッセージを取得する', () => {
      const error = new Error();
      const message = getUserFriendlyErrorMessage(error);

      expect(message).toBe('予期しないエラーが発生しました。');
    });

    test('空文字列メッセージのエラーから既定メッセージを取得する', () => {
      const error = new Error('');
      const message = getUserFriendlyErrorMessage(error);

      expect(message).toBe('予期しないエラーが発生しました。');
    });
  });
});
