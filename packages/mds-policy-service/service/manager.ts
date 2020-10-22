import { RpcServer } from '@mds-core/mds-rpc-common'
import { PolicyServiceDefinition } from '../@types'
import { PolicyServiceClient } from '../client'
import { PolicyServiceProvider } from './provider'

export const PolicyServiceManager = RpcServer(
  PolicyServiceDefinition,
  {
    onStart: PolicyServiceProvider.start,
    onStop: PolicyServiceProvider.stop
  },
  {
    name: args => PolicyServiceProvider.name(...args)
  },
  {
    port: process.env.POLICY_SERVICE_RPC_PORT,
    repl: {
      port: process.env.POLICY_SERVICE_REPL_PORT,
      context: { client: PolicyServiceClient }
    }
  }
)
