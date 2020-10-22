import { RpcServer } from '@mds-core/mds-rpc-common'
import { GeographyServiceDefinition } from '../@types'
import { GeographyServiceClient } from '../client'
import { GeographyServiceProvider } from './provider'

export const GeographyServiceManager = RpcServer(
  GeographyServiceDefinition,
  {
    onStart: GeographyServiceProvider.start,
    onStop: GeographyServiceProvider.stop
  },
  {
    name: args => GeographyServiceProvider.name(...args)
  },
  {
    port: process.env.GEOGRAPHY_SERVICE_RPC_PORT,
    repl: {
      port: process.env.GEOGRAPHY_SERVICE_REPL_PORT,
      context: { client: GeographyServiceClient }
    }
  }
)
