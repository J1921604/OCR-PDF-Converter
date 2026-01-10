// DownloadButton.jsx - ダウンロードボタンコンポーネント
import React from 'react';

export function DownloadButton({ pdfBlob, originalFileName, isReady }) {
  const handleDownload = () => {
    if (!pdfBlob) return;

    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    
    // ファイル名生成（元のファイル名 + "_searchable.pdf"）
    const outputFileName = originalFileName
      ? originalFileName.replace('.pdf', '_searchable.pdf')
      : 'searchable.pdf';
    
    link.download = outputFileName;
    link.click();

    // Blob URLを解放
    URL.revokeObjectURL(url);
  };

  if (!isReady) {
    return null;
  }

  return (
    <div className="download-section">
      <h3>変換完了！</h3>
      <p>検索可能PDFが生成されました</p>
      <button
        type="button"
        className="download-button"
        onClick={handleDownload}
        aria-label="検索可能PDFをダウンロード"
      >
        ダウンロード
      </button>
    </div>
  );
}
