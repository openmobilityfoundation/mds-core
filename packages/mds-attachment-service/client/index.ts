import { ServiceClient } from '@mds-core/mds-service-helpers'
import { RpcClient, RpcRequest } from '@mds-core/mds-rpc-common'
import { AttachmentService, AttachmentServiceDefinition } from '../@types'

const AttachmentServiceRpcClient = RpcClient(AttachmentServiceDefinition, {
  host: process.env.ATTACHMENT_SERVICE_RPC_HOST,
  port: process.env.ATTACHMENT_SERVICE_RPC_PORT
})

// What the API layer, and any other clients, will invoke.
export const AttachmentServiceClient: ServiceClient<AttachmentService> = {
  deleteAttachment: (...args) => RpcRequest(AttachmentServiceRpcClient.deleteAttachment, args),
  writeAttachment: (...args) => RpcRequest(AttachmentServiceRpcClient.writeAttachment, args)
}
