import { Configuration, ConfigurationFactory, ContextReplacementPlugin, IgnorePlugin, DefinePlugin } from 'webpack'
import GitRevisionPlugin from 'git-revision-webpack-plugin'
import merge from 'webpack-merge'

const gitRevisionPlugin = new GitRevisionPlugin({
  commithashCommand: 'rev-parse --short HEAD'
})

type CustomConfiguration = Omit<Configuration, 'entry'>

const MergeConfigurations = (entry = 'index') => (config: CustomConfiguration): ConfigurationFactory => (env, argv) => {
  const { npm_package_name = '', npm_package_version = '' } = typeof env === 'string' ? {} : env
  const dirname = process.cwd()
  return merge(
    {
      entry: { [entry]: `${dirname}/${entry}.ts` },
      output: { path: `${dirname}/dist`, filename: `${entry}.js`, libraryTarget: 'commonjs' },
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
        // Ignore Critical Dependency Warnings
        // https://medium.com/tomincode/hiding-critical-dependency-warnings-from-webpack-c76ccdb1f6c1
        ...['app-root-path', 'express', 'google-spreadsheet', 'optional', 'typeorm'].map(
          module =>
            new ContextReplacementPlugin(
              new RegExp(`node_modules/${module}`),
              (data: { dependencies: { critical: unknown }[] }) => {
                // eslint-disable-next-line no-param-reassign
                data.dependencies = data.dependencies.map(dependency => {
                  // eslint-disable-next-line no-param-reassign
                  delete dependency.critical
                  return dependency
                })
              }
            )
        ),
        // Ignore Optional Dependencies,
        ...[
          'pg-native', // Postgres
          'hiredis', // Redis
          ...['bufferutil', 'utf-8-validate'], // https://github.com/adieuadieu/serverless-chrome/issues/103#issuecomment-358261003
          ...[
            '@sap/hdbext',
            'ioredis',
            'mongodb',
            'mssql',
            'mysql',
            'mysql2',
            'oracledb',
            'pg-query-stream',
            'react-native-sqlite-storage',
            'sql.js',
            'sqlite3',
            'typeorm-aurora-data-api-driver'
          ] // TypeORM
        ].map(dependency => new IgnorePlugin(new RegExp(`^${dependency}$`))),
        // Make npm package name/version available to bundle
        new DefinePlugin({
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
      externals: {
        sharp: 'commonjs sharp'
      },
      target: 'node',
      stats: {
        all: false,
        assets: true,
        errors: true,
        warnings: true
      }
    },
    config
  )
}

const ConfigurationFactories = (entry: string) => ({
  CustomConfiguration: (config: CustomConfiguration) => MergeConfigurations(entry)(config),
  StandardConfiguration: () => MergeConfigurations(entry)({})
})

export default {
  ...ConfigurationFactories('index'),
  EntryPoint: (entry: string) => ConfigurationFactories(entry)
}
