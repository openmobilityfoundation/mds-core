import webpack from '@mds-core/mds-webpack-config'

export default webpack.CreateBundle('server').From('../../packages/mds-compliance/server.ts').UsingDefaultConfig()
