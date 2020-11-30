// eslint-disable-next-line @typescript-eslint/no-var-requires
const baseConfig = require('../../jest.config')

module.exports = { ...baseConfig, coverageThreshold: { global: { lines: 80 } } }
