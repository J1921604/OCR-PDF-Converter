/**
 * pdfGenerator.test.js - PDFジェネレーターサービスのテスト
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  createTextLayer,
  addTextLayerToPDF,
  convertImageToPDF,
} from '../../src/services/pdfGenerator';

// pdf-libのモック
jest.mock('pdf-lib', () => ({
  PDFDocument: {
    load: jest.fn(),
    create: jest.fn(),
  },
  StandardFonts: {
    Helvetica: 'Helvetica',
  },
  rgb: jest.fn((r, g, b) => ({ r, g, b })),
}));

describe('pdfGenerator', () => {
  describe('createTextLayer', () => {
    test('OCR結果からテキストレイヤーを作成する', () => {
      const ocrResult = {
        items: [
          {
            text: 'テスト',
            bbox: { x0: 10, y0: 20, x1: 60, y1: 40 },
            confidence: 0.95,
          },
          {
            text: '文字',
            bbox: { x0: 70, y0: 20, x1: 120, y1: 40 },
            confidence: 0.9,
          },
        ],
        imageHeight: 1000,
      };

      const textLayer = createTextLayer(ocrResult, 612, 792);

      expect(textLayer).toHaveLength(2);
      expect(textLayer[0].text).toBe('テスト');
      expect(textLayer[1].text).toBe('文字');
    });

    test('空のOCR結果から空のテキストレイヤーを作成する', () => {
      const ocrResult = {
        items: [],
        imageHeight: 1000,
      };

      const textLayer = createTextLayer(ocrResult, 612, 792);

      expect(textLayer).toHaveLength(0);
    });
  });

  describe('addTextLayerToPDF', () => {
    test('PDFにテキストレイヤーを追加する', async () => {
      const mockPage = {
        getWidth: jest.fn().mockReturnValue(612),
        getHeight: jest.fn().mockReturnValue(792),
        drawText: jest.fn(),
      };

      const mockPdfDoc = {
        getPage: jest.fn().mockReturnValue(mockPage),
        embedFont: jest.fn().mockResolvedValue('mockFont'),
        save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      };

      PDFDocument.load.mockResolvedValue(mockPdfDoc);

      const textLayers = [
        {
          pageNumber: 1,
          items: [
            {
              text: 'Test ASCII',
              x: 10,
              y: 20,
              width: 50,
              height: 20,
              fontSize: 20,
              confidence: 0.95,
            },
          ],
        },
      ];

      const arrayBuffer = new ArrayBuffer(100);
      const result = await addTextLayerToPDF(arrayBuffer, textLayers);

      expect(PDFDocument.load).toHaveBeenCalledWith(arrayBuffer);
      expect(mockPdfDoc.embedFont).toHaveBeenCalledWith(StandardFonts.Helvetica);
      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(0); // pageNumber 1 -> index 0
      expect(mockPage.drawText).toHaveBeenCalledWith('Test ASCII', {
        x: 10,
        y: 20,
        size: 20,
        font: 'mockFont',
        color: rgb(0, 0, 0),
        opacity: 0.0,
      });
      expect(mockPdfDoc.save).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Blob);
    });

    test('複数ページのPDFにテキストレイヤーを追加する', async () => {
      const mockPage1 = {
        drawText: jest.fn(),
      };

      const mockPage2 = {
        drawText: jest.fn(),
      };

      const mockPdfDoc = {
        getPage: jest.fn()
          .mockReturnValueOnce(mockPage1)
          .mockReturnValueOnce(mockPage2),
        embedFont: jest.fn().mockResolvedValue('mockFont'),
        save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      };

      PDFDocument.load.mockResolvedValue(mockPdfDoc);

      const textLayers = [
        {
          pageNumber: 1,
          items: [
            {
              text: 'ページ1',
              x: 10,
              y: 20,
              width: 50,
              height: 20,
              fontSize: 20,
              confidence: 0.95,
            },
          ],
        },
        {
          pageNumber: 2,
          items: [
            {
              text: 'ページ2',
              x: 15,
              y: 25,
              width: 60,
              height: 25,
              fontSize: 25,
              confidence: 0.9,
            },
          ],
        },
      ];

      const arrayBuffer = new ArrayBuffer(100);
      await addTextLayerToPDF(arrayBuffer, textLayers);

      expect(mockPdfDoc.getPage).toHaveBeenCalledTimes(2);
      expect(mockPdfDoc.getPage).toHaveBeenNthCalledWith(1, 0); // page 1 -> index 0
      expect(mockPdfDoc.getPage).toHaveBeenNthCalledWith(2, 1); // page 2 -> index 1
      expect(mockPage1.drawText).toHaveBeenCalledTimes(1);
      expect(mockPage2.drawText).toHaveBeenCalledTimes(1);
    });

    test('テキストレイヤーがない場合もPDFを返す', async () => {
      const mockPdfDoc = {
        getPages: jest.fn().mockReturnValue([]),
        embedFont: jest.fn().mockResolvedValue('mockFont'),
        save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      };

      PDFDocument.load.mockResolvedValue(mockPdfDoc);

      const arrayBuffer = new ArrayBuffer(100);
      const result = await addTextLayerToPDF(arrayBuffer, []);

      expect(mockPdfDoc.save).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('convertImageToPDF', () => {
    test('JPEG画像をPDFに変換する', async () => {
      const mockPage = {
        drawImage: jest.fn(),
      };

      const mockImage = { width: 800, height: 600 };

      const mockPdfDoc = {
        embedJpg: jest.fn().mockResolvedValue(mockImage),
        embedPng: jest.fn(),
        addPage: jest.fn().mockReturnValue(mockPage),
        save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      };

      PDFDocument.create.mockResolvedValue(mockPdfDoc);

      const arrayBuffer = new ArrayBuffer(100);
      const result = await convertImageToPDF(arrayBuffer, 'image/jpeg');

      expect(PDFDocument.create).toHaveBeenCalled();
      expect(mockPdfDoc.embedJpg).toHaveBeenCalledWith(arrayBuffer);
      expect(mockPdfDoc.addPage).toHaveBeenCalledWith([800, 600]);
      expect(mockPage.drawImage).toHaveBeenCalledWith(mockImage, {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
      });
      expect(mockPdfDoc.save).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/pdf');
    });

    test('PNG画像をPDFに変換する', async () => {
      const mockPage = {
        drawImage: jest.fn(),
      };

      const mockImage = { width: 1000, height: 800 };

      const mockPdfDoc = {
        embedJpg: jest.fn(),
        embedPng: jest.fn().mockResolvedValue(mockImage),
        addPage: jest.fn().mockReturnValue(mockPage),
        save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      };

      PDFDocument.create.mockResolvedValue(mockPdfDoc);

      const arrayBuffer = new ArrayBuffer(100);
      const result = await convertImageToPDF(arrayBuffer, 'image/png');

      expect(mockPdfDoc.embedPng).toHaveBeenCalledWith(arrayBuffer);
      expect(mockPdfDoc.addPage).toHaveBeenCalledWith([1000, 800]);
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/pdf');
    });

    test('TIFF画像の変換でエラーをスローする', async () => {
      const arrayBuffer = new ArrayBuffer(100);
      await expect(
        convertImageToPDF(arrayBuffer, 'image/tiff')
      ).rejects.toThrow('サポートされていない画像形式: TIFF');
    });

    test('サポートされていない形式でエラーをスローする', async () => {
      const arrayBuffer = new ArrayBuffer(100);
      await expect(
        convertImageToPDF(arrayBuffer, 'image/bmp')
      ).rejects.toThrow('サポートされていない画像形式');
    });
  });
});
