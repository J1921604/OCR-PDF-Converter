// App.jsx - メインアプリケーションコンポーネント
import React, { useState, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { OCRProgress } from './components/OCRProgress';
import { DownloadButton } from './components/DownloadButton';
import { useFileUpload } from './hooks/useFileUpload';
import { useOCR } from './hooks/useOCR';
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
    cancelProcessing,
  } = useOCR();

  const [searchablePDF, setSearchablePDF] = useState(null);
  const [globalError, setGlobalError] = useState(null);

  // ファイルが変更された場合、OCR処理をリセット
  useEffect(() => {
    if (file) {
      console.log('[App] 新しいファイルが選択されました。前回の処理をリセット');
      setSearchablePDF(null);
      setGlobalError(null);
      if (isProcessing) {
        cancelProcessing();
      }
    }
  }, [file, cancelProcessing]);

  const handleOCRStart = async () => {
    if (!file) return;

    console.log('[App] OCR処理開始:', file.name);
    setGlobalError(null);
    setSearchablePDF(null);

    try {
      // Pythonバックエンドで処理（PDFBlobを直接受け取る）
      console.log('[App] processPages 開始');
      const result = await processPages(file);
      console.log('[App] processPages 完了');

      if (result && result.pdfBlob) {
        console.log('[App] PDF取得完了, size:', result.pdfBlob.size);
        setSearchablePDF(result.pdfBlob);
      }
    } catch (error) {
      console.error('[App] OCR処理エラー:', error);
      setGlobalError(error);
    }
  };

  const handleReset = () => {
    console.log('[App] リセット実行');
    if (isProcessing) {
      cancelProcessing();
    }
    clearFile();
    setSearchablePDF(null);
    setGlobalError(null);
  };

  const showError = uploadError || ocrError || globalError;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>OCR検索可能PDF変換</h1>
        <p>スキャンしたPDFをOCR処理して、検索可能なPDFに変換します（OnnxOCR + Python）</p>
      </header>

      <main className="app-main">
        <FileUploader
          onFileSelect={handleFileSelect}
          fileInfo={fileInfo}
          error={uploadError}
          isLoading={isUploading}
          disabled={isProcessing}
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
        <p>Pythonバックエンド（OnnxOCR）で高精度OCR処理</p>
        <p>
          <a href="https://github.com/J1921604/OCR-PDF-Converter" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
