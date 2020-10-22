import { Timestamp } from '@mds-core/mds-types'
import { IdentityColumn, ModelMapper, RecordedColumn } from '@mds-core/mds-repository'
import { TelemetryEntityModel } from '../entities/telemetry-entity'
import { TelemetryDomainCreateModel, TelemetryDomainModel } from '../../@types'

type TelemetryEntityToDomainOptions = Partial<{}>

export const TelemetryEntityToDomain = ModelMapper<
  TelemetryEntityModel,
  TelemetryDomainModel,
  TelemetryEntityToDomainOptions
>((entity, options) => {
  const { id, lat, lng, speed, heading, accuracy, altitude, charge, ...domain } = entity
  return { gps: { lat, lng, speed, heading, accuracy, altitude }, charge, ...domain }
})

type TelemetryEntityCreateOptions = Partial<{
  recorded: Timestamp
}>

export type TelemetryEntityCreateModel = Omit<TelemetryEntityModel, keyof IdentityColumn | keyof RecordedColumn>

export const TelemetryDomainToEntityCreate = ModelMapper<
  TelemetryDomainCreateModel,
  TelemetryEntityCreateModel,
  TelemetryEntityCreateOptions
>(
  (
    { gps: { lat, lng, speed = null, heading = null, accuracy = null, altitude = null }, charge = null, ...domain },
    options
  ) => {
    const { recorded } = options ?? {}
    return {
      lat,
      lng,
      speed,
      heading,
      accuracy,
      altitude,
      charge,
      recorded,
      ...domain
    }
  }
)
