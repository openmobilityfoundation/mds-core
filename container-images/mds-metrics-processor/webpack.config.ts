import webpack from '@mds-core/mds-webpack-config'

export default webpack
  .Bundle('../../packages/mds-stream-processor/metrics.ts', { name: 'processor' })
  .UsingDefaultConfig()
