import { DomainModelCreate } from '@mds-core/mds-repository'
import { RpcServiceDefinition, RpcRoute } from '@mds-core/mds-rpc-common'
import { Nullable, Timestamp, UUID, Rule } from '@mds-core/mds-types'

export interface PolicyDomainModel {
  policy_id: UUID
  name: string
  description: string
  provider_ids: Nullable<UUID[]>
  start_date: Timestamp
  end_date: Nullable<Timestamp>
  prev_policies: Nullable<UUID[]>
  rules: Rule[]
  publish_date: Nullable<Timestamp>
}

export type PolicyDomainCreateModel = DomainModelCreate<PolicyDomainModel>

export interface PolicyMetadataDomainModel<M extends {} = {}> {
  policy_id: UUID
  policy_metadata: Nullable<M>
}

export type PolicyMetadataDomainCreateModel = DomainModelCreate<PolicyMetadataDomainModel>

export interface PolicyService {
  name: () => string
}

export const PolicyServiceDefinition: RpcServiceDefinition<PolicyService> = {
  name: RpcRoute<PolicyService['name']>()
}
