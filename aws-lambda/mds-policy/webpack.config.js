/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')
const merge = require('webpack-merge')
const config = require('../webpack.config')
/* eslint-enable @typescript-eslint/no-var-requires */

module.exports = (env, argv) => {
  return merge(config(env, argv), {
    entry: './index.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'index.js'
    }
  })
}
