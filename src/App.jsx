// App.jsx - メインアプリケーションコンポーネント
import React, { useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { OCRProgress } from './components/OCRProgress';
import { DownloadButton } from './components/DownloadButton';
import { useFileUpload } from './hooks/useFileUpload';
import { useOCR } from './hooks/useOCR';
import { addTextLayerToPDF } from './services/pdfGenerator';
import { getUserFriendlyErrorMessage } from './utils/errorHandler';
import './styles/main.css';

export function App() {
  const {
    file,
    fileInfo,
    error: uploadError,
    isLoading: isUploading,
    handleFileSelect,
    clearFile,
  } = useFileUpload();

  const {
    isProcessing,
    progress,
    ocrResults,
    textLayers,
    error: ocrError,
    processPages,
  } = useOCR();

  const [searchablePDF, setSearchablePDF] = useState(null);
  const [globalError, setGlobalError] = useState(null);

  const handleOCRStart = async () => {
    if (!file) return;

    setGlobalError(null);
    setSearchablePDF(null);

    try {
      // OCR処理実行
      const { textLayers: layers } = await processPages(file);

      // 検索可能PDF生成
      const pdfBlob = await addTextLayerToPDF(file, layers);
      setSearchablePDF(pdfBlob);
    } catch (error) {
      setGlobalError(error);
    }
  };

  const handleReset = () => {
    clearFile();
    setSearchablePDF(null);
    setGlobalError(null);
  };

  const showError = uploadError || ocrError || globalError;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>OCR検索可能PDF変換</h1>
        <p>スキャンしたPDFや画像をOCR処理して、検索可能なPDFに変換します</p>
      </header>

      <main className="app-main">
        <FileUploader
          onFileSelect={handleFileSelect}
          fileInfo={fileInfo}
          error={uploadError}
          isLoading={isUploading}
        />

        {file && !isProcessing && !searchablePDF && (
          <div className="action-buttons">
            <button
              type="button"
              className="ocr-button"
              onClick={handleOCRStart}
              disabled={isProcessing}
            >
              OCR変換開始
            </button>
          </div>
        )}

        <OCRProgress
          isProcessing={isProcessing}
          progress={progress}
          pageInfo={
            ocrResults.length > 0
              ? { current: ocrResults.length, total: ocrResults.length }
              : null
          }
        />

        {showError && (
          <div className="global-error" role="alert">
            <h3>エラーが発生しました</h3>
            <p>{getUserFriendlyErrorMessage(showError)}</p>
          </div>
        )}

        <DownloadButton
          pdfBlob={searchablePDF}
          originalFileName={fileInfo?.name}
          isReady={!!searchablePDF}
        />

        {searchablePDF && (
          <div className="reset-section">
            <button type="button" onClick={handleReset} className="reset-button">
              別のファイルを変換
            </button>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>完全クライアントサイド処理（ファイルはサーバーに送信されません）</p>
        <p>
          <a href="https://github.com/J1921604/OCR-PDF-Converter" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
