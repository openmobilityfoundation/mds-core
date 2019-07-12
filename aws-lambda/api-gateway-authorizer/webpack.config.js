module.exports = (env, argv) => require('../webpack.config')({
  env,
  argv,
  dirname: require('path').resolve(__dirname),
  bundles: ['index']
})
