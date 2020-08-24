import { RpcServer } from '@mds-core/mds-rpc-common'
import { JurisdictionServiceProvider } from '../service/provider'
import { JurisdictionServiceClient } from '../client'
import { JurisdictionServiceDefinition } from '../@types'

export const JurisdictionServiceManager = RpcServer(
  JurisdictionServiceDefinition,
  {
    onStart: JurisdictionServiceProvider.start,
    onStop: JurisdictionServiceProvider.stop
  },
  {
    createJurisdiction: async ([jurisdiction]) => JurisdictionServiceProvider.createJurisdiction(jurisdiction),
    createJurisdictions: async ([jurisdictions]) => JurisdictionServiceProvider.createJurisdictions(jurisdictions),
    deleteJurisdiction: async ([jurisdiction_id]) => JurisdictionServiceProvider.deleteJurisdiction(jurisdiction_id),
    getJurisdiction: async ([jurisdiction_id, options]) =>
      JurisdictionServiceProvider.getJurisdiction(jurisdiction_id, options),
    getJurisdictions: async ([options]) => JurisdictionServiceProvider.getJurisdictions(options),
    updateJurisdiction: async ([jurisdiction_id, update]) =>
      JurisdictionServiceProvider.updateJurisdiction(jurisdiction_id, update)
  },
  {
    port: process.env.JURISDICTION_SERVICE_RPC_PORT,
    repl: {
      port: process.env.JURISDICTION_SERVICE_REPL_PORT,
      context: { client: JurisdictionServiceClient }
    }
  }
)
