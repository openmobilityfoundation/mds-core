import webpack from '@mds-core/mds-webpack-config'

export default webpack.CreateBundle('server').From('../../packages/mds-policy-author/server.ts').UsingDefaultConfig()
