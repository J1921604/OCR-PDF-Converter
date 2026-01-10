module.exports = {
  GlobalWorkerOptions: {
    workerSrc: '',
  },
  getDocument: jest.fn(() => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: Object.assign(
        jest.fn(() => Promise.resolve({
          getViewport: () => ({ width: 100, height: 100 }),
          render: () => ({ promise: Promise.resolve() }),
        })),
        { bind: jest.fn() } // For safety if bind is called
      ),
    }),
  })),
  version: '2.0.0',
};
