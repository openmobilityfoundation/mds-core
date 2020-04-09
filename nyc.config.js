module.exports = {
  checkCoverage: true,
  extension: ['.ts'],
  exclude: ['tests', 'migrations'],
  lines: 80,
  reporter: ['text', 'html'],
  'temp-directory': './coverage/.nyc_output'
}
