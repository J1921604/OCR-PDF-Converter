const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8080',
    specPattern: 'tests/e2e/**/*.cy.{js,jsx}',
    supportFile: false,
    video: false,
    screenshotOnRunFailure: true,
  },
});
