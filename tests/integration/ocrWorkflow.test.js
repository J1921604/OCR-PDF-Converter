/**
 * ocrWorkflow.test.js - OCRワークフローの統合テスト
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../../src/App';
import * as pdfProcessor from '../../src/services/pdfProcessor';
import * as ocrEngine from '../../src/services/ocrEngine';
import * as pdfGenerator from '../../src/services/pdfGenerator';

// サービスのモック
jest.mock('../../src/services/pdfProcessor');
jest.mock('../../src/services/ocrEngine');
jest.mock('../../src/services/pdfGenerator');

describe('OCRワークフロー統合テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PDFアップロードから検索可能PDF生成まで', () => {
    test('単一ページPDFの完全なワークフロー', async () => {
      // モックデータの設定
      const mockPdf = { numPages: 1 };
      const mockPage = {
        getViewport: jest.fn().mockReturnValue({ width: 612, height: 792 }),
        render: jest.fn().mockReturnValue({ promise: Promise.resolve() }),
      };
      mockPdf.getPage = jest.fn().mockResolvedValue(mockPage);

      pdfProcessor.loadPDF.mockResolvedValue({
        pdf: mockPdf,
        pageCount: 1,
      });

      pdfProcessor.renderPageToImage.mockResolvedValue({
        canvas: document.createElement('canvas'),
        context: null,
      });

      pdfProcessor.getPageSize.mockReturnValue({
        width: 612,
        height: 792,
      });

      ocrEngine.initializeWorker.mockResolvedValue({
        terminate: jest.fn(),
      });

      ocrEngine.performOCR.mockResolvedValue({
        items: [
          {
            text: 'テスト',
            bbox: { x0: 10, y0: 20, x1: 60, y1: 40 },
            confidence: 0.95,
          },
        ],
        imageHeight: 1000,
        confidence: 95,
      });

      pdfGenerator.addTextLayerToPDF.mockResolvedValue(
        new Blob(['mock pdf'], { type: 'application/pdf' })
      );

      // コンポーネントのレンダリング
      render(<App />);

      // ファイル選択
      const file = new File(['pdf content'], 'test.pdf', {
        type: 'application/pdf',
      });
      const input = screen.getByLabelText(/ファイルを選択/i);
      fireEvent.change(input, { target: { files: [file] } });

      // ファイル情報が表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/test\.pdf/i)).toBeInTheDocument();
      });

      // OCR変換ボタンをクリック
      const ocrButton = screen.getByText(/OCR変換開始/i);
      fireEvent.click(ocrButton);

      // 進捗表示を確認
      await waitFor(() => {
        expect(screen.getByText(/処理中/i)).toBeInTheDocument();
      });

      // 完了後、ダウンロードボタンが表示されることを確認
      await waitFor(
        () => {
          expect(
            screen.getByText(/変換が完了しました/i)
          ).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // サービスが正しく呼ばれたことを確認
      expect(pdfProcessor.loadPDF).toHaveBeenCalledTimes(1);
      expect(pdfProcessor.renderPageToImage).toHaveBeenCalledTimes(1);
      expect(ocrEngine.performOCR).toHaveBeenCalledTimes(1);
      expect(pdfGenerator.addTextLayerToPDF).toHaveBeenCalledTimes(1);
    });

    test('複数ページPDFの完全なワークフロー', async () => {
      // 3ページのPDFをモック
      const mockPdf = { numPages: 3 };
      const mockPage = {
        getViewport: jest.fn().mockReturnValue({ width: 612, height: 792 }),
        render: jest.fn().mockReturnValue({ promise: Promise.resolve() }),
      };
      mockPdf.getPage = jest.fn().mockResolvedValue(mockPage);

      pdfProcessor.loadPDF.mockResolvedValue({
        pdf: mockPdf,
        pageCount: 3,
      });

      pdfProcessor.renderPageToImage.mockResolvedValue({
        canvas: document.createElement('canvas'),
        context: null,
      });

      pdfProcessor.getPageSize.mockReturnValue({
        width: 612,
        height: 792,
      });

      ocrEngine.initializeWorker.mockResolvedValue({
        terminate: jest.fn(),
      });

      ocrEngine.performOCR.mockResolvedValue({
        items: [
          {
            text: 'ページ',
            bbox: { x0: 10, y0: 20, x1: 60, y1: 40 },
            confidence: 0.9,
          },
        ],
        imageHeight: 1000,
        confidence: 90,
      });

      pdfGenerator.addTextLayerToPDF.mockResolvedValue(
        new Blob(['mock pdf'], { type: 'application/pdf' })
      );

      render(<App />);

      const file = new File(['pdf content'], 'multi-page.pdf', {
        type: 'application/pdf',
      });
      const input = screen.getByLabelText(/ファイルを選択/i);
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/multi-page\.pdf/i)).toBeInTheDocument();
      });

      const ocrButton = screen.getByText(/OCR変換開始/i);
      fireEvent.click(ocrButton);

      // 完了を待つ
      await waitFor(
        () => {
          expect(
            screen.getByText(/変換が完了しました/i)
          ).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      // 3ページ分のOCR処理が実行されたことを確認
      expect(pdfProcessor.renderPageToImage).toHaveBeenCalledTimes(3);
      expect(ocrEngine.performOCR).toHaveBeenCalledTimes(3);
    });
  });

  describe('画像アップロードからPDF変換まで', () => {
    test('JPEG画像の完全なワークフロー', async () => {
      // 画像からPDFへの変換をモック
      pdfGenerator.convertImageToPDF.mockResolvedValue(
        new ArrayBuffer(100)
      );

      // PDFの読み込みをモック
      const mockPdf = { numPages: 1 };
      const mockPage = {
        getViewport: jest.fn().mockReturnValue({ width: 612, height: 792 }),
        render: jest.fn().mockReturnValue({ promise: Promise.resolve() }),
      };
      mockPdf.getPage = jest.fn().mockResolvedValue(mockPage);

      pdfProcessor.loadPDF.mockResolvedValue({
        pdf: mockPdf,
        pageCount: 1,
      });

      pdfProcessor.renderPageToImage.mockResolvedValue({
        canvas: document.createElement('canvas'),
        context: null,
      });

      pdfProcessor.getPageSize.mockReturnValue({
        width: 612,
        height: 792,
      });

      ocrEngine.initializeWorker.mockResolvedValue({
        terminate: jest.fn(),
      });

      ocrEngine.performOCR.mockResolvedValue({
        items: [
          {
            text: '画像テキスト',
            bbox: { x0: 10, y0: 20, x1: 100, y1: 40 },
            confidence: 0.92,
          },
        ],
        imageHeight: 1000,
        confidence: 92,
      });

      pdfGenerator.addTextLayerToPDF.mockResolvedValue(
        new Blob(['mock pdf'], { type: 'application/pdf' })
      );

      render(<App />);

      // JPEG画像を選択
      const file = new File(['image content'], 'image.jpg', {
        type: 'image/jpeg',
      });
      const input = screen.getByLabelText(/ファイルを選択/i);
      fireEvent.change(input, { target: { files: [file] } });

      // 画像からPDFへの変換通知を確認
      await waitFor(() => {
        expect(
          screen.getByText(/画像ファイルはPDFに変換されます/i)
        ).toBeInTheDocument();
      });

      // OCR変換ボタンをクリック
      const ocrButton = screen.getByText(/OCR変換開始/i);
      fireEvent.click(ocrButton);

      // 完了を待つ
      await waitFor(
        () => {
          expect(
            screen.getByText(/変換が完了しました/i)
          ).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // 画像からPDFへの変換が実行されたことを確認
      expect(pdfGenerator.convertImageToPDF).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラーハンドリング', () => {
    test('PDFの読み込みエラーを表示する', async () => {
      pdfProcessor.loadPDF.mockRejectedValue(
        new Error('PDF読み込みエラー')
      );

      render(<App />);

      const file = new File(['pdf content'], 'error.pdf', {
        type: 'application/pdf',
      });
      const input = screen.getByLabelText(/ファイルを選択/i);
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/error\.pdf/i)).toBeInTheDocument();
      });

      const ocrButton = screen.getByText(/OCR変換開始/i);
      fireEvent.click(ocrButton);

      await waitFor(() => {
        expect(
          screen.getByText(/PDF読み込みエラー/i)
        ).toBeInTheDocument();
      });
    });

    test('OCR処理エラーを表示する', async () => {
      const mockPdf = { numPages: 1 };
      const mockPage = {
        getViewport: jest.fn().mockReturnValue({ width: 612, height: 792 }),
        render: jest.fn().mockReturnValue({ promise: Promise.resolve() }),
      };
      mockPdf.getPage = jest.fn().mockResolvedValue(mockPage);

      pdfProcessor.loadPDF.mockResolvedValue({
        pdf: mockPdf,
        pageCount: 1,
      });

      pdfProcessor.renderPageToImage.mockResolvedValue({
        canvas: document.createElement('canvas'),
        context: null,
      });

      pdfProcessor.getPageSize.mockReturnValue({
        width: 612,
        height: 792,
      });

      ocrEngine.initializeWorker.mockResolvedValue({
        terminate: jest.fn(),
      });

      ocrEngine.performOCR.mockRejectedValue(new Error('OCR処理エラー'));

      render(<App />);

      const file = new File(['pdf content'], 'test.pdf', {
        type: 'application/pdf',
      });
      const input = screen.getByLabelText(/ファイルを選択/i);
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/test\.pdf/i)).toBeInTheDocument();
      });

      const ocrButton = screen.getByText(/OCR変換開始/i);
      fireEvent.click(ocrButton);

      await waitFor(() => {
        expect(
          screen.getByText(/OCR処理エラー/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('リセット機能', () => {
    test('リセットボタンで初期状態に戻る', async () => {
      const mockPdf = { numPages: 1 };
      const mockPage = {
        getViewport: jest.fn().mockReturnValue({ width: 612, height: 792 }),
        render: jest.fn().mockReturnValue({ promise: Promise.resolve() }),
      };
      mockPdf.getPage = jest.fn().mockResolvedValue(mockPage);

      pdfProcessor.loadPDF.mockResolvedValue({
        pdf: mockPdf,
        pageCount: 1,
      });

      pdfProcessor.renderPageToImage.mockResolvedValue({
        canvas: document.createElement('canvas'),
        context: null,
      });

      pdfProcessor.getPageSize.mockReturnValue({
        width: 612,
        height: 792,
      });

      ocrEngine.initializeWorker.mockResolvedValue({
        terminate: jest.fn(),
      });

      ocrEngine.performOCR.mockResolvedValue({
        items: [],
        imageHeight: 1000,
        confidence: 90,
      });

      pdfGenerator.addTextLayerToPDF.mockResolvedValue(
        new Blob(['mock pdf'], { type: 'application/pdf' })
      );

      render(<App />);

      // ファイルをアップロード
      const file = new File(['pdf content'], 'test.pdf', {
        type: 'application/pdf',
      });
      const input = screen.getByLabelText(/ファイルを選択/i);
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/test\.pdf/i)).toBeInTheDocument();
      });

      // OCR変換を実行
      const ocrButton = screen.getByText(/OCR変換開始/i);
      fireEvent.click(ocrButton);

      await waitFor(
        () => {
          expect(
            screen.getByText(/変換が完了しました/i)
          ).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // リセットボタンをクリック
      const resetButton = screen.getByText(/最初に戻る/i);
      fireEvent.click(resetButton);

      // ファイル選択画面に戻ることを確認
      await waitFor(() => {
        expect(
          screen.getByText(/PDFファイルまたは画像ファイルを選択/i)
        ).toBeInTheDocument();
      });
    });
  });
});
