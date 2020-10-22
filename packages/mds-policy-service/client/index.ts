import { ServiceClient } from '@mds-core/mds-service-helpers'
import { RpcClient, RpcRequest } from '@mds-core/mds-rpc-common'
import { PolicyService, PolicyServiceDefinition } from '../@types'

const PolicyServiceRpcClient = RpcClient(PolicyServiceDefinition, {
  host: process.env.POLICY_SERVICE_RPC_HOST,
  port: process.env.POLICY_SERVICE_RPC_PORT
})

// What the API layer, and any other clients, will invoke.
export const PolicyServiceClient: ServiceClient<PolicyService> = {
  name: (...args) => RpcRequest(PolicyServiceRpcClient.name, args)
}
