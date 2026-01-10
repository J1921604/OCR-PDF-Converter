// OCR処理用カスタムHook（Pythonバックエンド連携版）
import { useState, useCallback, useRef } from 'react';
import { handleOCRError } from '../utils/errorHandler';

// APIエンドポイント設定
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export function useOCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrResults, setOcrResults] = useState([]);
  const [textLayers, setTextLayers] = useState([]);
  const [error, setError] = useState(null);
  
  // 処理中断用のフラグ
  const abortControllerRef = useRef(null);

  const processPages = useCallback(async (file) => {
    console.log('[useOCR] OCR処理開始 (Pythonバックエンド):', file.name);
    
    // 前回の処理をリセット
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setIsProcessing(true);
    setProgress(0);
    setOcrResults([]);
    setTextLayers([]);
    setError(null);
    
    // 新しいAbortControllerを作成
    abortControllerRef.current = new AbortController();

    try {
      // FormDataを作成
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dpi', '300');
      formData.append('confidence_threshold', '0.5');

      console.log('[useOCR] APIリクエスト送信中...');
      setProgress(10);

      // PythonバックエンドにOCR処理をリクエスト
      const response = await fetch(`${API_BASE_URL}/api/ocr/process`, {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'OCR処理に失敗しました');
      }

      const result = await response.json();
      console.log('[useOCR] OCR処理完了:', result);

      if (!result.success) {
        throw new Error(result.error || 'OCR処理に失敗しました');
      }

      setProgress(80);

      // 処理済みPDFをダウンロード
      console.log('[useOCR] 処理済みPDFダウンロード中...');
      const downloadResponse = await fetch(`${API_BASE_URL}/api/ocr/download/${result.file_id}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!downloadResponse.ok) {
        throw new Error('PDFのダウンロードに失敗しました');
      }

      const pdfBlob = await downloadResponse.blob();
      console.log('[useOCR] PDFダウンロード完了, size:', pdfBlob.size);

      setProgress(100);

      // ダミーのtextLayersを返す（Appコンポーネント互換性のため）
      return { 
        textLayers: [], 
        pdfBlob: pdfBlob,
        pagesProcessed: result.pages_processed 
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[useOCR] 処理が中断されました');
        return { textLayers: [], pdfBlob: null };
      }
      
      const handledError = handleOCRError(err, 0);
      setError(handledError);
      throw handledError;
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  }, []);

  // 処理をキャンセルする関数
  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsProcessing(false);
      setProgress(0);
      console.log('[useOCR] 処理をキャンセルしました');
    }
  }, []);

  return {
    isProcessing,
    progress,
    ocrResults,
    textLayers,
    error,
    processPages,
    cancelProcessing,
  };
}
