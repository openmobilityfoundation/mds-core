import { ServiceClient } from '@mds-core/mds-service-helpers'
import { RpcClient, RpcRequest } from '@mds-core/mds-rpc-common'
import { GeographyService, GeographyServiceDefinition } from '../@types'

const GeographyServiceRpcClient = RpcClient(GeographyServiceDefinition, {
  host: process.env.GEOGRAPHY_SERVICE_RPC_HOST,
  port: process.env.GEOGRAPHY_SERVICE_RPC_PORT
})

// What the API layer, and any other clients, will invoke.
export const GeographyServiceClient: ServiceClient<GeographyService> = {
  getGeography: (...args) => RpcRequest(GeographyServiceRpcClient.getGeography, args),
  getGeographies: (...args) => RpcRequest(GeographyServiceRpcClient.getGeographies, args),
  getUnpublishedGeographies: (...args) => RpcRequest(GeographyServiceRpcClient.getUnpublishedGeographies, args),
  getPublishedGeographies: (...args) => RpcRequest(GeographyServiceRpcClient.getPublishedGeographies, args),
  writeGeographies: (...args) => RpcRequest(GeographyServiceRpcClient.writeGeographies, args),
  writeGeographiesMetadata: (...args) => RpcRequest(GeographyServiceRpcClient.writeGeographiesMetadata, args)
}
