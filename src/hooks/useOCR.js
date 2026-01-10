// OCR処理用カスタムHook
import { useState, useCallback } from 'react';
import { loadPDF, renderPageToImage, getPageSize } from '../services/pdfProcessor';
import { performOCR, initializeWorker } from '../services/ocrEngine';
import { createTextLayer } from '../services/pdfGenerator';
import { handleOCRError } from '../utils/errorHandler';

export function useOCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrResults, setOcrResults] = useState([]);
  const [textLayers, setTextLayers] = useState([]);
  const [error, setError] = useState(null);

  const processPages = useCallback(async (file) => {
    console.log('[useOCR] OCR処理開始:', file.name);
    setIsProcessing(true);
    setProgress(0);
    setOcrResults([]);
    setTextLayers([]);
    setError(null);

    try {
      // PDFロード
      console.log('[useOCR] PDFロード開始');
      const { pdf, pageCount } = await loadPDF(file);
      console.log('[useOCR] PDFロード完了, ページ数:', pageCount);

      const results = [];
      const layers = [];
      const batchSize = 4; // 並列処理数

      // バッチ処理（4並列）
      for (let i = 0; i < pageCount; i += batchSize) {
        console.log(`[useOCR] バッチ処理 ${i + 1}-${Math.min(i + batchSize, pageCount)} / ${pageCount}`);
        const batch = [];

        for (let j = 0; j < batchSize && i + j < pageCount; j++) {
          const pageNumber = i + j + 1;
          batch.push(processPage(pdf, pageNumber));
        }

        // 並列実行
        const batchResults = await Promise.all(batch);

        for (const result of batchResults) {
          results.push(result.ocrResult);
          layers.push(result.textLayer);
        }

        // 進捗更新
        const processed = Math.min(i + batchSize, pageCount);
        const progressPercent = (processed / pageCount) * 100;
        console.log(`[useOCR] 進捗: ${progressPercent.toFixed(1)}%`);
        setProgress(progressPercent);
        setOcrResults([...results]);
        setTextLayers([...layers]);
      }

      return { ocrResults: results, textLayers: layers };
    } catch (err) {
      const handledError = handleOCRError(err, 0);
      setError(handledError);
      throw handledError;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const processPage = async (pdf, pageNumber) => {
    // ページを画像に変換
    const { canvas, imageData, width, height } = await renderPageToImage(pdf, pageNumber);

    // ページサイズ取得（PDF座標系）
    const pageSize = await getPageSize(pdf, pageNumber);

    // OCR実行（Canvas要素を優先的に使用）
    const ocrResult = await performOCR(canvas || imageData, pageNumber);

    // テキストレイヤー生成
    const textLayerItems = createTextLayer(ocrResult, pageSize.height);

    return {
      ocrResult,
      textLayer: {
        pageNumber,
        items: textLayerItems,
      },
    };
  };

  return {
    isProcessing,
    progress,
    ocrResults,
    textLayers,
    error,
    processPages,
  };
}
