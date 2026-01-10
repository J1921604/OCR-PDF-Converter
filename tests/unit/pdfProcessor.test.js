/**
 * pdfProcessor.test.js - PDFプロセッサーサービスのテスト
 */

import * as pdfjsLib from 'pdfjs-dist';
import { loadPDF, renderPageToImage, getPageSize } from '../../src/services/pdfProcessor';

// PDF.jsのモック
jest.mock('pdfjs-dist', () => ({
  getDocument: jest.fn(),
  GlobalWorkerOptions: {
    workerSrc: '',
  },
}));

describe('pdfProcessor', () => {
  describe('loadPDF', () => {
    test('PDFを正常に読み込む', async () => {
      const mockPdf = {
        numPages: 3,
      };

      pdfjsLib.getDocument.mockReturnValue({
        promise: Promise.resolve(mockPdf),
      });

      const arrayBuffer = new ArrayBuffer(100);
      const result = await loadPDF(arrayBuffer);

      expect(result.pdf).toBe(mockPdf);
      expect(result.pageCount).toBe(3);
      expect(pdfjsLib.getDocument).toHaveBeenCalledWith({
        data: arrayBuffer,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
        cMapPacked: true,
      });
    });

    test('PDFの読み込みに失敗した場合エラーをスローする', async () => {
      pdfjsLib.getDocument.mockReturnValue({
        promise: Promise.reject(new Error('PDF読み込みエラー')),
      });

      const arrayBuffer = new ArrayBuffer(100);
      await expect(loadPDF(arrayBuffer)).rejects.toThrow('PDF読み込みエラー');
    });

    test('空のArrayBufferでエラーをスローする', async () => {
      pdfjsLib.getDocument.mockReturnValue({
        promise: Promise.reject(new Error('Invalid PDF')),
      });

      const arrayBuffer = new ArrayBuffer(0);
      await expect(loadPDF(arrayBuffer)).rejects.toThrow();
    });
  });

  describe('renderPageToImage', () => {
    test('ページを画像にレンダリングする', async () => {
      const mockCanvas = document.createElement('canvas');
      const mockContext = mockCanvas.getContext('2d');

      const mockViewport = {
        width: 612,
        height: 792,
      };

      const mockPage = {
        getViewport: jest.fn().mockReturnValue(mockViewport),
        render: jest.fn().mockReturnValue({
          promise: Promise.resolve(),
        }),
      };

      jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas);
      jest.spyOn(mockCanvas, 'getContext').mockReturnValue(mockContext);

      const result = await renderPageToImage(mockPage);

      expect(mockPage.getViewport).toHaveBeenCalledWith({ scale: 4.17 });
      expect(mockCanvas.width).toBe(612);
      expect(mockCanvas.height).toBe(792);
      expect(mockPage.render).toHaveBeenCalledWith({
        canvasContext: mockContext,
        viewport: mockViewport,
      });
      expect(result.canvas).toBe(mockCanvas);
      expect(result.context).toBe(mockContext);

      jest.restoreAllMocks();
    });

    test('レンダリングに失敗した場合エラーをスローする', async () => {
      const mockPage = {
        getViewport: jest.fn().mockReturnValue({
          width: 612,
          height: 792,
        }),
        render: jest.fn().mockReturnValue({
          promise: Promise.reject(new Error('レンダリングエラー')),
        }),
      };

      await expect(renderPageToImage(mockPage)).rejects.toThrow(
        'レンダリングエラー'
      );
    });
  });

  describe('getPageSize', () => {
    test('ページサイズを取得する', () => {
      const mockViewport = {
        width: 612,
        height: 792,
      };

      const mockPage = {
        getViewport: jest.fn().mockReturnValue(mockViewport),
      };

      const result = getPageSize(mockPage);

      expect(mockPage.getViewport).toHaveBeenCalledWith({ scale: 1.0 });
      expect(result.width).toBe(612);
      expect(result.height).toBe(792);
    });

    test('異なるページサイズを取得する', () => {
      const mockViewport = {
        width: 842,
        height: 1191,
      };

      const mockPage = {
        getViewport: jest.fn().mockReturnValue(mockViewport),
      };

      const result = getPageSize(mockPage);

      expect(result.width).toBe(842);
      expect(result.height).toBe(1191);
    });

    test('小さいページサイズを取得する', () => {
      const mockViewport = {
        width: 200,
        height: 300,
      };

      const mockPage = {
        getViewport: jest.fn().mockReturnValue(mockViewport),
      };

      const result = getPageSize(mockPage);

      expect(result.width).toBe(200);
      expect(result.height).toBe(300);
    });
  });
});
