const webpack = require('webpack')
const GitRevisionPlugin = require('git-revision-webpack-plugin')

const gitRevisionPlugin = new GitRevisionPlugin({
  commithashCommand: 'rev-parse --short HEAD'
})

module.exports = ({ env, argv, dirname, bundles }) => {
  const { npm_package_name, npm_package_version } = env
  const [, package] = npm_package_name.split('/')
  const dist = `${dirname}/dist`
  return bundles.map(bundle => ({
    entry: { [bundle]: `${dirname}/${bundle}.ts` },
    output: { path: dist, filename: `${bundle}.js` },
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
      new webpack.ContextReplacementPlugin(
        /node_modules\/express\/lib|node_modules\/optional|node_modules\/google-spreadsheet/,
        data => {
          delete data.dependencies[0].critical
          return data
        }
      ),
      // Make npm package name/version available to bundle
      new webpack.DefinePlugin({
        NPM_PACKAGE_NAME: JSON.stringify(npm_package_name),
        NPM_PACKAGE_VERSION: JSON.stringify(npm_package_version),
        NPM_PACKAGE_GIT_BRANCH: JSON.stringify(gitRevisionPlugin.branch()),
        NPM_PACKAGE_GIT_COMMIT: JSON.stringify(gitRevisionPlugin.commithash()),
        NPM_PACKAGE_BUILD_DATE: JSON.stringify(new Date().toISOString())
      })
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
  }))
}
