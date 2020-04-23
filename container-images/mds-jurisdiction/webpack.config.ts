import webpack from '@mds-core/mds-webpack-config'

export default webpack.CreateBundle('server').From('../../packages/mds-jurisdiction/server.ts').UsingDefaultConfig()
