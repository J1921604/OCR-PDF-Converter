/**
 * ocrEngine.test.js - OCRエンジンサービスのテスト
 */

import { createWorker } from 'tesseract.js';
import { initializeWorker, performOCR } from '../../src/services/ocrEngine';

// Tesseract.jsのモック
jest.mock('tesseract.js', () => ({
  createWorker: jest.fn(),
}));

describe('ocrEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeWorker', () => {
    test('OCRワーカーを初期化する', async () => {
      const mockWorker = {
        loadLanguage: jest.fn().mockResolvedValue(undefined),
        initialize: jest.fn().mockResolvedValue(undefined),
      };

      createWorker.mockResolvedValue(mockWorker);

      const worker = await initializeWorker();

      expect(createWorker).toHaveBeenCalledWith('jpn', 1, expect.objectContaining({
        workerPath: expect.any(String),
        langPath: expect.any(String),
        corePath: expect.any(String),
      }));
      expect(worker).toBe(mockWorker);
    });

    test('ワーカー初期化に失敗した場合エラーをスローする', async () => {
      createWorker.mockRejectedValue(new Error('初期化エラー'));

      await expect(initializeWorker()).rejects.toThrow('初期化エラー');
    });
  });

  describe('performOCR', () => {
    test('OCR処理を実行する', async () => {
      const mockRecognizeResult = {
        data: {
          words: [
            {
              text: 'テスト',
              bbox: { x0: 10, y0: 20, x1: 60, y1: 40 },
              confidence: 95,
            },
            {
              text: '文字',
              bbox: { x0: 70, y0: 20, x1: 120, y1: 40 },
              confidence: 90,
            },
          ],
          confidence: 92.5,
        },
      };

      const mockWorker = {
        recognize: jest.fn().mockResolvedValue(mockRecognizeResult),
        terminate: jest.fn().mockResolvedValue(undefined),
      };

      const mockCanvas = document.createElement('canvas');
      mockCanvas.height = 1000;

      // Workerを明示的に渡さず、新規作成させる
      createWorker.mockResolvedValue(mockWorker);
      const result = await performOCR(mockCanvas, 1);

      expect(mockWorker.recognize).toHaveBeenCalledWith(mockCanvas);
      expect(mockWorker.terminate).toHaveBeenCalled();
      expect(result.items).toHaveLength(2);
      expect(result.items[0].text).toBe('テスト');
      expect(result.items[1].text).toBe('文字');
      expect(result.confidence).toBe(0.925);
      expect(result.imageHeight).toBe(1000);
    });

    test('信頼度の低いテキストをフィルタリングする', async () => {
      const mockRecognizeResult = {
        data: {
          words: [
            {
              text: '高信頼度',
              bbox: { x0: 10, y0: 20, x1: 60, y1: 40 },
              confidence: 80,
            },
            {
              text: '低信頼度',
              bbox: { x0: 70, y0: 20, x1: 120, y1: 40 },
              confidence: 40,
            },
          ],
          confidence: 60,
        },
      };

      const mockWorker = {
        recognize: jest.fn().mockResolvedValue(mockRecognizeResult),
        terminate: jest.fn().mockResolvedValue(undefined),
      };

      const mockCanvas = document.createElement('canvas');
      mockCanvas.height = 500;

      const result = await performOCR(mockCanvas, null, mockWorker);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].text).toBe('高信頼度');
      expect(result.items[0].confidence).toBe(0.8);
    });

    test('既存のワーカーを使用する', async () => {
      const mockRecognizeResult = {
        data: {
          words: [
            {
              text: 'テスト',
              bbox: { x0: 10, y0: 20, x1: 60, y1: 40 },
              confidence: 95,
            },
          ],
          confidence: 95,
        },
      };

      const mockExistingWorker = {
        recognize: jest.fn().mockResolvedValue(mockRecognizeResult),
      };

      const mockCanvas = document.createElement('canvas');
      mockCanvas.height = 1000;

      const result = await performOCR(mockCanvas, 1, mockExistingWorker);

      expect(mockExistingWorker.recognize).toHaveBeenCalledWith(mockCanvas);
      expect(result.items).toHaveLength(1);
      expect(result.pageNumber).toBe(1);
    });

    test('OCR処理に失敗した場合エラーをスローする', async () => {
      const mockWorker = {
        recognize: jest.fn().mockRejectedValue(new Error('OCRエラー')),
        terminate: jest.fn().mockResolvedValue(undefined),
      };

      createWorker.mockResolvedValue(mockWorker);
      const mockCanvas = document.createElement('canvas');

      await expect(
        performOCR(mockCanvas, 1)
      ).rejects.toThrow('OCRエラー');
      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    test('空のテキストをフィルタリングする', async () => {
      const mockRecognizeResult = {
        data: {
          words: [
            {
              text: 'テスト',
              bbox: { x0: 10, y0: 20, x1: 60, y1: 40 },
              confidence: 95,
            },
            {
              text: '',
              bbox: { x0: 70, y0: 20, x1: 120, y1: 40 },
              confidence: 90,
            },
            {
              text: '   ',
              bbox: { x0: 130, y0: 20, x1: 180, y1: 40 },
              confidence: 85,
            },
          ],
          confidence: 90,
        },
      };

      const mockWorker = {
        recognize: jest.fn().mockResolvedValue(mockRecognizeResult),
        terminate: jest.fn().mockResolvedValue(undefined),
      };

      const mockCanvas = document.createElement('canvas');
      mockCanvas.height = 1000;

      const result = await performOCR(mockCanvas, null, mockWorker);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].text).toBe('テスト');
    });
  });
});
