module.exports = {
  ...require('../../.jest/jest.config.js'),
  /*
   * Remove the below section for your package once you've
   * reached the desired global threshold defined in ../../jest.config
   */
  coverageThreshold: {
    global: {
      lines: 55
    }
  }
}
