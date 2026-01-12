// tests/unit/useOCR.test.js
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOCR } from '../../src/hooks/useOCR';

// fetch APIをモック
global.fetch = jest.fn();

describe('useOCR Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('初期状態が正しく設定されている', () => {
    const { result } = renderHook(() => useOCR());
    
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.ocrResults).toEqual([]);
    expect(result.current.textLayers).toEqual([]);
    expect(result.current.accuracySummary).toEqual({});
    expect(result.current.error).toBeNull();
  });

  it('OCR処理が正常に実行される', async () => {
    const mockFile = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    const mockPdfBlob = new Blob(['mock pdf'], { type: 'application/pdf' });
    
    // APIレスポンスをモック
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          file_id: 'test-file-id',
          pages_processed: 5,
          engines: ['onnxocr', 'paddleocr'],
          engine_stats: {
            onnxocr: { avg_confidence: 0.85, total_text_count: 100 },
            paddleocr: { avg_confidence: 0.92, total_text_count: 110 },
          },
          best_engine: 'paddleocr',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => mockPdfBlob,
      });
    
    const { result } = renderHook(() => useOCR());
    
    let processResult;
    await act(async () => {
      processResult = await result.current.processPages(mockFile, ['onnxocr', 'paddleocr']);
    });
    
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.progress).toBe(100);
    expect(result.current.error).toBeNull();
    expect(processResult.pdfBlob).toBe(mockPdfBlob);
    expect(processResult.pagesProcessed).toBe(5);
    expect(processResult.engines).toEqual(['onnxocr', 'paddleocr']);
    expect(processResult.bestEngine).toBe('paddleocr');
  });

  it('単一エンジンでOCR処理が実行される', async () => {
    const mockFile = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    const mockPdfBlob = new Blob(['mock pdf'], { type: 'application/pdf' });
    
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          file_id: 'test-file-id',
          pages_processed: 3,
          engines: ['onnxocr'],
          engine_stats: {
            onnxocr: { avg_confidence: 0.88, total_text_count: 75 },
          },
          best_engine: 'onnxocr',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => mockPdfBlob,
      });
    
    const { result } = renderHook(() => useOCR());
    
    let processResult;
    await act(async () => {
      processResult = await result.current.processPages(mockFile, ['onnxocr']);
    });
    
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.progress).toBe(100);
    expect(processResult.pdfBlob).toBe(mockPdfBlob);
    expect(processResult.engines).toEqual(['onnxocr']);
  });

  it('OCR処理APIエラーが正しく処理される', async () => {
    const mockFile = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'APIエラーが発生しました' }),
    });
    
    const { result } = renderHook(() => useOCR());
    
    await act(async () => {
      try {
        await result.current.processPages(mockFile, ['onnxocr']);
      } catch (error) {
        // エラーが発生することを期待
      }
    });
    
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it('ダウンロードAPIエラーが正しく処理される', async () => {
    const mockFile = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          file_id: 'test-file-id',
          pages_processed: 1,
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'ダウンロードエラー' }),
      });
    
    const { result } = renderHook(() => useOCR());
    
    await act(async () => {
      try {
        await result.current.processPages(mockFile, ['onnxocr']);
      } catch (error) {
        // エラーが発生することを期待
      }
    });
    
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it('処理中にキャンセルできる', async () => {
    const mockFile = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    
    // 処理を長時間実行させるためのPromise
    let resolveFetch;
    const delayedPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    
    global.fetch.mockReturnValue(delayedPromise);
    
    const { result } = renderHook(() => useOCR());
    
    // OCR処理を開始
    act(() => {
      result.current.processPages(mockFile, ['onnxocr']);
    });
    
    // 処理中であることを確認
    await waitFor(() => {
      expect(result.current.isProcessing).toBe(true);
    });
    
    // キャンセル実行
    act(() => {
      result.current.cancelProcessing();
    });
    
    // キャンセル後の状態を確認
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.ocrResults).toEqual([]);
    expect(result.current.textLayers).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('processPages実行時に進捗が更新される', async () => {
    const mockFile = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    const mockPdfBlob = new Blob(['mock pdf'], { type: 'application/pdf' });
    
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          file_id: 'test-file-id',
          pages_processed: 2,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => mockPdfBlob,
      });
    
    const { result } = renderHook(() => useOCR());
    
    act(() => {
      result.current.processPages(mockFile, ['onnxocr']);
    });
    
    // 初期進捗が設定されることを確認
    await waitFor(() => {
      expect(result.current.progress).toBeGreaterThan(0);
    });
    
    // 処理完了まで待機
    await waitFor(() => {
      expect(result.current.isProcessing).toBe(false);
    });
    
    expect(result.current.progress).toBe(100);
  });

  it('精度サマリーが正しく設定される', async () => {
    const mockFile = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    const mockPdfBlob = new Blob(['mock pdf'], { type: 'application/pdf' });
    
    const mockEngineStats = {
      onnxocr: { avg_confidence: 0.75, total_text_count: 50, pages_processed: 3 },
      paddleocr: { avg_confidence: 0.88, total_text_count: 65, pages_processed: 3 },
    };
    
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          file_id: 'test-file-id',
          pages_processed: 3,
          engine_stats: mockEngineStats,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => mockPdfBlob,
      });
    
    const { result } = renderHook(() => useOCR());
    
    await act(async () => {
      await result.current.processPages(mockFile, ['onnxocr', 'paddleocr']);
    });
    
    expect(result.current.accuracySummary).toEqual(mockEngineStats);
  });

  it('AbortErrorが発生した場合は正しく処理される', async () => {
    const mockFile = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    
    global.fetch.mockRejectedValueOnce(abortError);
    
    const { result } = renderHook(() => useOCR());
    
    let processResult;
    await act(async () => {
      processResult = await result.current.processPages(mockFile, ['onnxocr']);
    });
    
    expect(result.current.isProcessing).toBe(false);
    expect(processResult.textLayers).toEqual([]);
    expect(processResult.pdfBlob).toBeNull();
  });
});
