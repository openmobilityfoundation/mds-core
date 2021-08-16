module.exports = {
  ...require('../../.jest/jest.config.js'),
  coverageThreshold: {
    global: {
      lines: 45
    }
  }
}
