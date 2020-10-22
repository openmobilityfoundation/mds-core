import { RpcServer } from '@mds-core/mds-rpc-common'
import { AuditServiceDefinition } from '../@types'
import { AuditServiceClient } from '../client'
import { AuditServiceProvider } from './provider'

export const AuditServiceManager = RpcServer(
  AuditServiceDefinition,
  {
    onStart: AuditServiceProvider.start,
    onStop: AuditServiceProvider.stop
  },
  {
    name: args => AuditServiceProvider.name(...args)
  },
  {
    port: process.env.AUDIT_SERVICE_RPC_PORT,
    repl: {
      port: process.env.AUDIT_SERVICE_REPL_PORT,
      context: { client: AuditServiceClient }
    }
  }
)
