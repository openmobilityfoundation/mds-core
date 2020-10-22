import { RpcServer } from '@mds-core/mds-rpc-common'
import { IngestServiceDefinition } from '../@types'
import { IngestServiceClient } from '../client'
import { IngestServiceProvider } from './provider'

export const IngestServiceManager = RpcServer(
  IngestServiceDefinition,
  {
    onStart: IngestServiceProvider.start,
    onStop: IngestServiceProvider.stop
  },
  {
    name: args => IngestServiceProvider.name(...args)
  },
  {
    port: process.env.MDS_INGEST_SERVICE_RPC_PORT,
    repl: {
      port: process.env.MDS_INGEST_SERVICE_REPL_PORT,
      context: { client: IngestServiceClient }
    }
  }
)
