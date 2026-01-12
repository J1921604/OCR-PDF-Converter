module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/mocks/styleMock.js',
    '^pdfjs-dist$': '<rootDir>/tests/mocks/pdfjs-dist.js',
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(pdfjs-dist)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.jsx',
    '!src/**/*.test.{js,jsx}',
    '!src/**/*_backup.{js,jsx}',
    '!src/App_backup.jsx',
    '!src/hooks/useOCR_backup.js',
  ],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 40,
      lines: 40,
      statements: 40,
    },
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,jsx}',
  ],
};
