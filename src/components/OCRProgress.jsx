// OCRProgress.jsx - OCR進捗表示コンポーネント
import React from 'react';

export function OCRProgress({ isProcessing, progress, pageInfo }) {
  // 未処理状態（progress=0かつ未開始）または完了状態（progress=100かつ処理終了）は非表示
  if (!isProcessing && (progress === 0 || progress === 100)) {
    return null;
  }

  return (
    <div className="ocr-progress" data-testid="ocr-progress">
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
