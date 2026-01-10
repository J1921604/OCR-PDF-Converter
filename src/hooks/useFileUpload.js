// ファイルアップロード用カスタムHook
import { useState } from 'react';
import { validateFile, isImageFile } from '../utils/fileValidator';
import { ValidationError } from '../utils/errorHandler';
import { convertImageToPDF } from '../services/pdfGenerator';

export function useFileUpload() {
  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = async (selectedFile) => {
    console.log('[useFileUpload] ファイル選択:', selectedFile.name, 'Type:', selectedFile.type, 'Size:', selectedFile.size);
    setError(null);
    setIsLoading(true);

    try {
      // ファイル検証
      console.log('[useFileUpload] ファイル検証開始');
      const validation = validateFile(selectedFile);
      if (!validation.isValid) {
        console.error('[useFileUpload] 検証失敗:', validation.errors);
        throw new ValidationError('ファイル検証失敗', validation.errors);
      }
      console.log('[useFileUpload] 検証成功');

      // 画像ファイルの場合、PDFに変換
      let processedFile = selectedFile;
      if (isImageFile(selectedFile)) {
        console.log('[useFileUpload] 画像ファイルをPDFに変換中');
        const pdfBlob = await convertImageToPDF(selectedFile);
        processedFile = new File([pdfBlob], selectedFile.name.replace(/\.[^.]+$/, '.pdf'), {
          type: 'application/pdf',
        });
        console.log('[useFileUpload] PDF変換完了');
      }

      setFile(processedFile);
      setFileInfo({
        name: processedFile.name,
        size: processedFile.size,
        type: processedFile.type,
        isConverted: isImageFile(selectedFile),
      });
      console.log('[useFileUpload] ファイル設定完了');
    } catch (err) {
      console.error('[useFileUpload] エラー:', err);
      setError(err);
      setFile(null);
      setFileInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setFileInfo(null);
    setError(null);
  };

  return {
    file,
    fileInfo,
    error,
    isLoading,
    handleFileSelect,
    clearFile,
  };
}
