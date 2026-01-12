import '@testing-library/jest-dom';

// Mock Worker for Web Workers
global.Worker = class Worker {
  constructor() {
    this.onmessage = null;
  }
  postMessage() {}
  terminate() {}
};

// Mock Blob URL creation
global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
