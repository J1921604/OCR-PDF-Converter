// OCRProgress.jsx - OCR進捗表示コンポーネント
import React from 'react';

export function OCRProgress({ isProcessing, progress, pageInfo, accuracySummary }) {
  // 未処理状態（progress=0かつ未開始）で、表示すべき情報が何もない場合のみ非表示
  // ※ OCR完了後(progress=100)でも精度サマリーはユーザーが確認できるように表示する
  if (!isProcessing && progress === 0 && (!accuracySummary || Object.keys(accuracySummary).length === 0)) {
    return null;
  }

  return (
    <div className="ocr-progress" data-testid="ocr-progress">
      <h3>{isProcessing ? 'OCR処理中...' : 'OCR処理完了'}</h3>
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
      <p className="progress-text">{Math.round(progress)}% 完了</p>
      {pageInfo && (
        <p className="page-info">
          {pageInfo.current} / {pageInfo.total} ページ処理中
        </p>
      )}
      {accuracySummary && Object.keys(accuracySummary).length > 0 && (
        <div className="accuracy-summary">
          <h4>OCR精度サマリー</h4>
          {Object.entries(accuracySummary).map(([engine, data]) => (
            <div key={engine} className="engine-accuracy">
              <span className="engine-name">{engine.toUpperCase()}</span>
              {data && data.error ? (
                <span className="text-count">利用不可: {String(data.error)}</span>
              ) : (
                <>
                  <span className="accuracy-value">
                    平均信頼度: {typeof data?.avg_confidence === 'number' ? `${(data.avg_confidence * 100).toFixed(1)}%` : 'N/A'}
                  </span>
                  <span className="text-count">検出テキスト数: {data.total_text_count}</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
