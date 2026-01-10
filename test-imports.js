// 簡易テストスクリプト
console.log('=== OCR-PDF-Converter Test Script ===');

// Reactのインポートテスト
import('./src/index.jsx')
  .then(() => {
    console.log('✓ index.jsx loaded successfully');
  })
  .catch(err => {
    console.error('✗ Failed to load index.jsx:', err);
  });

// PDF.jsのインポートテスト
import('pdfjs-dist')
  .then(pdfjsLib => {
    console.log('✓ pdfjs-dist loaded successfully');
    console.log('  Version:', pdfjsLib.version);
  })
  .catch(err => {
    console.error('✗ Failed to load pdfjs-dist:', err);
  });

// Tesseract.jsのインポートテスト
import('tesseract.js')
  .then(tesseract => {
    console.log('✓ tesseract.js loaded successfully');
  })
  .catch(err => {
    console.error('✗ Failed to load tesseract.js:', err);
  });

// pdf-libのインポートテスト
import('pdf-lib')
  .then(pdfLib => {
    console.log('✓ pdf-lib loaded successfully');
  })
  .catch(err => {
    console.error('✗ Failed to load pdf-lib:', err);
  });

console.log('=== Test Complete ===');
