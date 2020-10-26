import { ServiceClient } from '@mds-core/mds-service-helpers'
import { RpcClient, RpcRequest } from '@mds-core/mds-rpc-common'
import { IngestService, IngestServiceDefinition } from '../@types'

const IngestServiceRpcClient = RpcClient(IngestServiceDefinition, {
  host: process.env.INGEST_SERVICE_RPC_HOST,
  port: process.env.INGEST_SERVICE_RPC_PORT
})

// What the API layer, and any other clients, will invoke.
export const IngestServiceClient: ServiceClient<IngestService> = {
  name: (...args) => RpcRequest(IngestServiceRpcClient.name, args)
}
