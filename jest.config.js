module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      tsConfig: '../../tsconfig.json'
    }
  },
  setupFiles: ['dotenv/config'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  coverageThreshold: {
    global: {
      lines: 85
    }
  },
  coverageReporters: ['text', 'html'],
  coverageDirectory: './coverage/',
  collectCoverage: true,
  testTimeout: 10000
}
