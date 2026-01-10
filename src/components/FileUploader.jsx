// FileUploader.jsx - PDFアップロードコンポーネント
import React, { useRef } from 'react';
import { getUserFriendlyErrorMessage } from '../utils/errorHandler';

export function FileUploader({ onFileSelect, fileInfo, error, isLoading, disabled }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (disabled) return;

    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      onFileSelect(droppedFile);
    }
  };

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="file-uploader">
      <div
        className={`upload-area ${disabled ? 'disabled' : ''}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="PDFファイルまたは画像をアップロード"
        aria-disabled={disabled}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/jpeg,image/png,image/tiff"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={disabled}
        />
        <p>PDFまたは画像をドラッグ＆ドロップ</p>
        <p>または</p>
        <button type="button" disabled={isLoading || disabled}>
          {isLoading ? 'ファイル処理中...' : 'ファイルを選択'}
        </button>
        <p className="file-info-text">対応形式: PDF, JPEG, PNG, TIFF（50MB以下）</p>
      </div>

      {fileInfo && (
        <div className="file-info">
          <h3>選択されたファイル</h3>
          <p>名前: {fileInfo.name}</p>
          <p>サイズ: {(fileInfo.size / 1024 / 1024).toFixed(2)} MB</p>
          <p>形式: {fileInfo.type}</p>
          {fileInfo.isConverted && (
            <p className="conversion-notice">画像ファイルがPDFに変換されました</p>
          )}
        </div>
      )}

      {error && (
        <div className="error-message" role="alert">
          {getUserFriendlyErrorMessage(error)}
        </div>
      )}
    </div>
  );
}
