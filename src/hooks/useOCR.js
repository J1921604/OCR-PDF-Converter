// OCR処理用カスタムHook（Pythonバックエンド連携版）
import { useState, useCallback, useRef } from 'react';
import { handleOCRError } from '../utils/errorHandler';

// APIエンドポイント設定
// webpack.DefinePlugin で `process.env.REACT_APP_API_URL` は文字列にインライン化される想定。
// ただしテスト/ブラウザ環境で `process` が存在しないケースもあるため安全に評価する。
const API_BASE_URL =
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL)
    ? process.env.REACT_APP_API_URL
    : 'http://localhost:5000';

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
        let message = 'OCR処理に失敗しました';
        try {
          const errorData = await response.json();
          message = errorData?.error || message;
        } catch (_) {
          try {
            const text = await response.text();
            if (text) message = text;
          } catch (_) {
            // ignore
          }
        }
        throw new Error(message);
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
        let message = 'PDFのダウンロードに失敗しました';
        try {
          const errorData = await downloadResponse.json();
          message = errorData?.error || message;
        } catch (_) {
          // ignore
        }
        throw new Error(message);
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
      
      // Pythonバックエンドが返すエラー詳細を潰さないよう、ページ番号は付与しない
      const handledError = handleOCRError(err);
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
      // UI状態を確実に初期化
      setIsProcessing(false);
      setProgress(0);
      setOcrResults([]);
      setTextLayers([]);
      setError(null);
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
