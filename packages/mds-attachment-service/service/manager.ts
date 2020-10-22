import { RpcServer } from '@mds-core/mds-rpc-common'
import { AttachmentServiceDefinition } from '../@types'
import { AttachmentServiceClient } from '../client'
import { AttachmentServiceProvider } from './provider'

export const AttachmentServiceManager = RpcServer(
  AttachmentServiceDefinition,
  {
    onStart: AttachmentServiceProvider.start,
    onStop: AttachmentServiceProvider.stop
  },
  {
    name: args => AttachmentServiceProvider.name(...args)
  },
  {
    port: process.env.ATTACHMENT_SERVICE_RPC_PORT,
    repl: {
      port: process.env.ATTACHMENT_SERVICE_REPL_PORT,
      context: { client: AttachmentServiceClient }
    }
  }
)
