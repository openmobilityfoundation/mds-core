const ZipPlugin = require('zip-webpack-plugin')
const webpack = require('webpack')

module.exports = ({ npm_package_name, npm_package_version }) => {
  const [path, filename] = npm_package_name.split('/')
  return {
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/
        }
      ]
    },
    plugins: [
      // Ignore optional Postgres dependency
      new webpack.IgnorePlugin(/^pg-native$/),
      // Ignore optional Redis dependency
      new webpack.IgnorePlugin(/^hiredis$/),
      // Ignore optional bufferutil/utf-8-validate dependencies
      // https://github.com/adieuadieu/serverless-chrome/issues/103#issuecomment-358261003
      new webpack.IgnorePlugin(/^bufferutil$/),
      new webpack.IgnorePlugin(/^utf-8-validate$/),
      // Ignore Critical Dependency Warnings
      // https://medium.com/tomincode/hiding-critical-dependency-warnings-from-webpack-c76ccdb1f6c1
      new webpack.ContextReplacementPlugin(/node_modules\/express\/lib|node_modules\/optional/, data => {
        delete data.dependencies[0].critical
        return data
      }),
      // Make npm package name/version available to AWS Lambda handler
      new webpack.DefinePlugin({
        NPM_PACKAGE_NAME: JSON.stringify(npm_package_name),
        NPM_PACKAGE_VERSION: JSON.stringify(npm_package_version)
      }),
      // Zip the dist folder
      new ZipPlugin({ path, filename })
    ],
    resolve: {
      extensions: ['.ts', '.js']
    },
    output: {
      libraryTarget: 'commonjs'
    },
    target: 'node',
    stats: {
      all: false,
      assets: true,
      errors: true,
      warnings: true
    }
  }
}
