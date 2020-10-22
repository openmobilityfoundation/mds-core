import { IdentityColumn, ModelMapper } from '@mds-core/mds-repository'
import { GeographyEntityModel } from './entities/geography-entity'
import {
  GeographyDomainCreateModel,
  GeographyDomainModel,
  GeographyMetadataDomainModel,
  GeographyMetadataDomainCreateModel
} from '../@types'
import { GeographyMetadataEntityModel } from './entities/geography-metadata-entity'

type GeographyEntityToDomainOptions = Partial<{}>

export const GeographyEntityToDomain = ModelMapper<
  GeographyEntityModel,
  GeographyDomainModel,
  GeographyEntityToDomainOptions
>((entity, options) => {
  const { id, ...domain } = entity
  return domain
})

type GeographyEntityCreateOptions = Partial<{}>

export type GeographyEntityCreateModel = Omit<GeographyEntityModel, keyof IdentityColumn>

export const GeographyDomainToEntityCreate = ModelMapper<
  GeographyDomainCreateModel,
  GeographyEntityCreateModel,
  GeographyEntityCreateOptions
>(
  (
    { name = null, description = null, effective_date = null, publish_date = null, prev_geographies = null, ...domain },
    options
  ) => {
    return { name, description, effective_date, publish_date, prev_geographies, ...domain }
  }
)

type GeographyMetadataEntityToDomainOptions = Partial<{}>

export const GeographyMetadataEntityToDomain = ModelMapper<
  GeographyMetadataEntityModel,
  GeographyMetadataDomainModel,
  GeographyMetadataEntityToDomainOptions
>((entity, options) => {
  const { id, ...domain } = entity
  return domain
})

type GeographyMetadataEntityCreateOptions = Partial<{}>

export type GeographyMetadataEntityCreateModel = Omit<GeographyMetadataEntityModel, keyof IdentityColumn>

export const GeographyMetadataDomainToEntityCreate = ModelMapper<
  GeographyMetadataDomainCreateModel,
  GeographyMetadataEntityCreateModel,
  GeographyMetadataEntityCreateOptions
>(({ geography_metadata = null, ...domain }, options) => {
  return { geography_metadata, ...domain }
})
