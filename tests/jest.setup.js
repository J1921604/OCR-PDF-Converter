/**
 * jest.setup.js - Jestのセットアップファイル
 */

// @testing-library/jest-domをインポート
import '@testing-library/jest-dom';

// WebAssemblyのモック（Tesseract.jsがWebAssemblyを使用するため）
global.WebAssembly = {
  instantiate: jest.fn(),
  compile: jest.fn(),
  Module: jest.fn(),
  Instance: jest.fn(),
  Memory: jest.fn(),
  Table: jest.fn(),
  CompileError: Error,
  LinkError: Error,
  RuntimeError: Error,
};

// Blobのモック
global.Blob = class Blob {
  constructor(parts, options) {
    this.parts = parts;
    this.options = options;
    this.size = parts.reduce((acc, part) => acc + part.length, 0);
    this.type = options?.type || '';
  }

  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(this.size));
  }

  text() {
    return Promise.resolve(this.parts.join(''));
  }

  slice() {
    return new Blob(this.parts, this.options);
  }
};

// URLのモック
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// FileReaderのモック
global.FileReader = class FileReader {
  constructor() {
    this.result = null;
    this.error = null;
    this.readyState = 0;
    this.onload = null;
    this.onerror = null;
  }

  readAsArrayBuffer(blob) {
    this.readyState = 2;
    this.result = new ArrayBuffer(blob.size || 100);
    if (this.onload) {
      this.onload({ target: this });
    }
  }

  readAsDataURL(blob) {
    this.readyState = 2;
    this.result = 'data:application/pdf;base64,mock';
    if (this.onload) {
      this.onload({ target: this });
    }
  }

  readAsText(blob) {
    this.readyState = 2;
    this.result = blob.parts?.join('') || 'mock text';
    if (this.onload) {
      this.onload({ target: this });
    }
  }
};

// Canvasのモック
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(4),
  })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(4),
  })),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
}));

HTMLCanvasElement.prototype.toDataURL = jest.fn(
  () => 'data:image/png;base64,mock'
);
HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
  callback(new Blob(['mock'], { type: 'image/png' }));
});

// OffscreenCanvasのモック（一部のブラウザで使用される）
if (typeof OffscreenCanvas === 'undefined') {
  global.OffscreenCanvas = class OffscreenCanvas {
    constructor(width, height) {
      this.width = width;
      this.height = height;
    }

    getContext() {
      return HTMLCanvasElement.prototype.getContext();
    }

    convertToBlob() {
      return Promise.resolve(new Blob(['mock'], { type: 'image/png' }));
    }
  };
}

// Worker のモック
global.Worker = class Worker {
  constructor(stringUrl) {
    this.url = stringUrl;
    this.onmessage = null;
    this.onerror = null;
  }

  postMessage(msg) {
    if (this.onmessage) {
      this.onmessage({ data: msg });
    }
  }

  terminate() {}
};

// IntersectionObserver のモック
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
};

// ResizeObserver のモック
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// console.errorとconsole.warnを抑制（不要なログを減らす）
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
