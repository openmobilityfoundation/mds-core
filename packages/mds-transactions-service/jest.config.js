// eslint-disable-next-line @typescript-eslint/no-var-requires
const baseConfig = require('../../jest.config')

module.exports = {
  ...baseConfig,
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
