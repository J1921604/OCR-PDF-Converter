// OCRProgress.jsx - OCR進捗表示コンポーネント
import React from 'react';

export function OCRProgress({ isProcessing, progress, pageInfo }) {
  if (!isProcessing && progress === 0) {
    return null;
  }

  return (
    <div className="ocr-progress">
      <h3>OCR処理中...</h3>
      <div
        className="progress-bar-container"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div
          className="progress-bar"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="progress-text">
        {Math.round(progress)}% 完了
      </p>
      {pageInfo && (
        <p className="page-info">
          {pageInfo.current} / {pageInfo.total} ページ処理中
        </p>
      )}
    </div>
  );
}
