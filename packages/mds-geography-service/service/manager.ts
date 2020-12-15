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
    getGeography: args => GeographyServiceProvider.getGeography(...args),
    getGeographies: args => GeographyServiceProvider.getGeographies(...args),
    getUnpublishedGeographies: args => GeographyServiceProvider.getUnpublishedGeographies(...args),
    getPublishedGeographies: args => GeographyServiceProvider.getPublishedGeographies(...args),
    writeGeographies: args => GeographyServiceProvider.writeGeographies(...args),
    writeGeographiesMetadata: args => GeographyServiceProvider.writeGeographiesMetadata(...args)
  },
  {
    port: process.env.GEOGRAPHY_SERVICE_RPC_PORT,
    repl: {
      port: process.env.GEOGRAPHY_SERVICE_REPL_PORT,
      context: { client: GeographyServiceClient }
    }
  }
)
