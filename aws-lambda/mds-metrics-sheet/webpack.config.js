const path = require('path')
const merge = require('webpack-merge')
const config = require('../webpack.config')

module.exports = (env, argv) => {
  return merge(config(env, argv), {
    entry: {'metrics-log':'./metrics-log.ts', 'vehicle-counts':'./vehicle-counts.ts'},
    output: {
      path: path.resolve(__dirname, 'dist')    }
  })
}
