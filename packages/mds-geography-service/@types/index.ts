import { DomainModelCreate } from '@mds-core/mds-repository'
import { RpcServiceDefinition, RpcRoute } from '@mds-core/mds-rpc-common'
import { Nullable, Timestamp, UUID } from '@mds-core/mds-types'
import { FeatureCollection } from 'geojson'

export interface GeographyDomainModel {
  geography_id: UUID
  name: Nullable<string>
  description: Nullable<string>
  effective_date: Nullable<Timestamp>
  publish_date: Nullable<Timestamp>
  prev_geographies: Nullable<UUID[]>
  geography_json: FeatureCollection
}

export type GeographyDomainCreateModel = DomainModelCreate<GeographyDomainModel>

export interface GeographyMetadataDomainModel<M extends {} = {}> {
  geography_id: UUID
  geography_metadata: Nullable<M>
}

export type GeographyMetadataDomainCreateModel = DomainModelCreate<GeographyMetadataDomainModel>

export interface GeographyService {
  name: () => string
}

export const GeographyServiceDefinition: RpcServiceDefinition<GeographyService> = {
  name: RpcRoute<GeographyService['name']>()
}
