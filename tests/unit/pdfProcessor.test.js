import { loadPDF, renderPageToImage, getPageSize } from '../../src/services/pdfProcessor';
import * as pdfjsLib from 'pdfjs-dist';

// Mock pdfjs-dist
jest.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {
    workerSrc: '',
  },
  getDocument: jest.fn(),
}));

describe('pdfProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadPDF', () => {
    it('should load a PDF file successfully', async () => {
      const mockPdf = { numPages: 5 };
      const mockPromise = Promise.resolve(mockPdf);
      pdfjsLib.getDocument.mockReturnValue({ promise: mockPromise });

      const mockFile = new Blob(['dummy content'], { type: 'application/pdf' });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));

      const result = await loadPDF(mockFile);

      expect(mockFile.arrayBuffer).toHaveBeenCalled();
      expect(pdfjsLib.getDocument).toHaveBeenCalled();
      expect(result).toEqual({ pdf: mockPdf, pageCount: 5 });
    });

    it('should throw an error if loading fails', async () => {
      const mockFile = new Blob(['dummy'], { type: 'application/pdf' });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));
      pdfjsLib.getDocument.mockReturnValue({
        promise: Promise.reject(new Error('Load error')),
      });

      await expect(loadPDF(mockFile)).rejects.toThrow('PDFLoading failed: Load error');
    });
  });

  describe('renderPageToImage', () => {
    it('should render a page to image data', async () => {
      const mockContext = {
        getImageData: jest.fn().mockReturnValue('mock-image-data'),
      };
      const mockCanvas = {
        getContext: jest.fn().mockReturnValue(mockContext),
        width: 0,
        height: 0,
      };
      
      // Mock document.createElement logic roughly
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn((tag) => {
        if (tag === 'canvas') return mockCanvas;
        return originalCreateElement(tag);
      });

      const mockPage = {
        getViewport: jest.fn().mockReturnValue({ width: 100, height: 200 }),
        render: jest.fn().mockReturnValue({ promise: Promise.resolve() }),
      };
      const mockPdf = {
        getPage: jest.fn().mockResolvedValue(mockPage),
      };

      const result = await renderPageToImage(mockPdf, 1);

      expect(mockPdf.getPage).toHaveBeenCalledWith(1);
      expect(mockPage.getViewport).toHaveBeenCalled();
      expect(mockPage.render).toHaveBeenCalled();
      expect(result).toEqual({
        imageData: 'mock-image-data',
        width: 100,
        height: 200,
      });

      document.createElement = originalCreateElement;
    });

    it('should throw error on render failure', async () => {
      const mockPdf = {
        getPage: jest.fn().mockRejectedValue(new Error('Page error')),
      };

      await expect(renderPageToImage(mockPdf, 1)).rejects.toThrow('Page 1 rendering failed: Page error');
    });
  });

  describe('getPageSize', () => {
    it('should return page dimensions', async () => {
      const mockPage = {
        getViewport: jest.fn().mockReturnValue({ width: 500, height: 800 }),
      };
      const mockPdf = {
        getPage: jest.fn().mockResolvedValue(mockPage),
      };

      const result = await getPageSize(mockPdf, 1);
      expect(mockPdf.getPage).toHaveBeenCalledWith(1);
      expect(result).toEqual({ width: 500, height: 800 });
    });
  });
});
