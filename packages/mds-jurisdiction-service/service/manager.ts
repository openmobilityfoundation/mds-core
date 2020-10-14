import { RpcServer } from '@mds-core/mds-rpc-common'
import { JurisdictionServiceProvider } from './provider'
import { JurisdictionServiceClient } from '../client'
import { JurisdictionServiceDefinition } from '../@types'

export const JurisdictionServiceManager = RpcServer(
  JurisdictionServiceDefinition,
  {
    onStart: JurisdictionServiceProvider.start,
    onStop: JurisdictionServiceProvider.stop
  },
  {
    createJurisdiction: args => JurisdictionServiceProvider.createJurisdiction(...args),
    createJurisdictions: args => JurisdictionServiceProvider.createJurisdictions(...args),
    deleteJurisdiction: args => JurisdictionServiceProvider.deleteJurisdiction(...args),
    getJurisdiction: args => JurisdictionServiceProvider.getJurisdiction(...args),
    getJurisdictions: args => JurisdictionServiceProvider.getJurisdictions(...args),
    updateJurisdiction: args => JurisdictionServiceProvider.updateJurisdiction(...args)
  },
  {
    port: process.env.JURISDICTION_SERVICE_RPC_PORT,
    repl: {
      port: process.env.JURISDICTION_SERVICE_REPL_PORT,
      context: { client: JurisdictionServiceClient }
    }
  }
)
