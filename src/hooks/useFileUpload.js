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
    setError(null);
    setIsLoading(true);

    try {
      // ファイル検証
      const validation = validateFile(selectedFile);
      if (!validation.valid) {
        throw new ValidationError('ファイル検証失敗', validation.errors);
      }

      // 画像ファイルの場合、PDFに変換
      let processedFile = selectedFile;
      if (isImageFile(selectedFile)) {
        const pdfBlob = await convertImageToPDF(selectedFile);
        processedFile = new File([pdfBlob], selectedFile.name.replace(/\.[^.]+$/, '.pdf'), {
          type: 'application/pdf',
        });
      }

      setFile(processedFile);
      setFileInfo({
        name: processedFile.name,
        size: processedFile.size,
        type: processedFile.type,
        isConverted: isImageFile(selectedFile),
      });
    } catch (err) {
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
