module.exports = {
  colors: true,
  recursive: true,
  require: ['tsconfig-paths/register', 'source-map-support/register', 'dotenv/config'],
  spec: 'tests/**/*.ts',
  timeout: 10000
}
