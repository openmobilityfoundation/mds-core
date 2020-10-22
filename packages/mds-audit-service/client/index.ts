import { ServiceClient } from '@mds-core/mds-service-helpers'
import { RpcClient, RpcRequest } from '@mds-core/mds-rpc-common'
import { AuditService, AuditServiceDefinition } from '../@types'

const AuditServiceRpcClient = RpcClient(AuditServiceDefinition, {
  host: process.env.AUDIT_SERVICE_RPC_HOST,
  port: process.env.AUDIT_SERVICE_RPC_PORT
})

// What the API layer, and any other clients, will invoke.
export const AuditServiceClient: ServiceClient<AuditService> = {
  name: (...args) => RpcRequest(AuditServiceRpcClient.name, args)
}
