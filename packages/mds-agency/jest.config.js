// eslint-disable-next-line @typescript-eslint/no-var-requires
const baseConfig = require('../../jest.config')

module.exports = { ...baseConfig, testMatch: ['**/__jest-tests__/**/*.ts', '**/?(*.)+(jest.)+(spec|test).ts'] }
