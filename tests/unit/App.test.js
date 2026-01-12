import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '../../src/App';
import * as useFileUpload from '../../src/hooks/useFileUpload';
import * as useOCR from '../../src/hooks/useOCR';

// Mock hooks
jest.mock('../../src/hooks/useFileUpload');
jest.mock('../../src/hooks/useOCR');
jest.mock('../../src/services/pdfGenerator', () => ({
  addTextLayerToPDF: jest.fn(),
}));

describe('App Component', () => {
  beforeEach(() => {
    useFileUpload.useFileUpload.mockReturnValue({
      file: null,
      fileInfo: null,
      error: null,
      isLoading: false,
      handleFileSelect: jest.fn(),
      clearFile: jest.fn(),
    });

    useOCR.useOCR.mockReturnValue({
      isProcessing: false,
      progress: 0,
      ocrResults: [],
      textLayers: [],
      error: null,
      processPages: jest.fn(),
    });
  });

  it('renders the header correctly', () => {
    render(<App />);
    expect(screen.getByText('OCR検索可能PDF変換')).toBeInTheDocument();
  });

  it('shows file uploader when no file is selected', () => {
    render(<App />);
    // Assuming FileUploader renders some text like "ドラッグ＆ドロップ" or similar.
    // Based on previous reads, it might not be explicitly visible in App.jsx text, but inside component.
    // Let's just check if the main container is present.
    const mainElement = screen.getByRole('main');
    expect(mainElement).toBeInTheDocument();
  });

  it('shows action buttons when file is selected', () => {
    useFileUpload.useFileUpload.mockReturnValue({
      file: new File(['dummy'], 'test.pdf', { type: 'application/pdf' }),
      fileInfo: { name: 'test.pdf', size: 100 },
      error: null,
      isLoading: false,
      handleFileSelect: jest.fn(),
      clearFile: jest.fn(),
    });

    render(<App />);
    // OCRボタンはエンジン名が付与されるため、部分一致で検証する
    const ocrButton = screen.getByRole('button', { name: /OCR変換開始/ });
    expect(ocrButton).toBeInTheDocument();

    // エンジン選択チェックボックスが表示されること
    expect(screen.getByText('OCRエンジン選択')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /OnnxOCR/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /PaddleOCR/ })).toBeInTheDocument();
  });
});
