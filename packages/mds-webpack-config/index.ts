/*
    Copyright 2019-2020 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import { Configuration, ConfigurationFactory, ContextReplacementPlugin, IgnorePlugin } from 'webpack'
import GitRevisionPlugin from 'git-revision-webpack-plugin'
import WrapperWebpackPlugin from 'wrapper-webpack-plugin'
import WebpackMerge from 'webpack-merge'
import { parse, resolve } from 'path'

const gitRevisionPlugin = new GitRevisionPlugin({ commithashCommand: 'rev-parse --short HEAD' })

type CustomConfiguration = Omit<Configuration, 'entry'>

const MergeConfigurations = (name: string, path: string, config: CustomConfiguration = {}): ConfigurationFactory => (
  env,
  argv
) => {
  const dirname = process.cwd()

  const entry = {
    [name]: path || `${dirname}/${name}.ts`
  }

  const { npm_package_name = '', npm_package_version = '' } = typeof env === 'string' ? {} : env

  console.log('BUNDLE:', resolve(entry[name])) /* eslint-disable-line no-console */

  return WebpackMerge(
    {
      entry,
      output: { path: `${dirname}/dist`, filename: `${name}.js`, libraryTarget: 'commonjs' },
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
        new WrapperWebpackPlugin({
          header: () =>
            `Object.assign(process.env, {
              npm_package_name: '${npm_package_name}',
              npm_package_version: '${npm_package_version}',
              npm_package_git_branch: '${gitRevisionPlugin.branch()}',
              npm_package_git_commit: '${gitRevisionPlugin.commithash()}',
              npm_package_build_date: '${new Date().toISOString()}'
            });`
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

type WebpackConfigurationBuilderOptions = Partial<{
  name: string
}>

class WebpackConfigurationBuilder {
  private name: string

  constructor(private path: string, { name }: WebpackConfigurationBuilderOptions = {}) {
    this.name = name || parse(path).name
  }

  public UsingDefaultConfig() {
    return MergeConfigurations(this.name, this.path)
  }

  public UsingCustomConfig(config: CustomConfiguration) {
    return MergeConfigurations(this.name, this.path, config)
  }
}

export default {
  Bundle: (path: string, options?: WebpackConfigurationBuilderOptions) => new WebpackConfigurationBuilder(path, options)
}
