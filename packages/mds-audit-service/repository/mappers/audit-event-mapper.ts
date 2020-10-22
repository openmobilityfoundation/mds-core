import { Optional, Timestamp } from '@mds-core/mds-types'
import { IdentityColumn, ModelMapper, RecordedColumn } from '@mds-core/mds-repository'
import { AuditEventEntityModel } from '../entities/audit-event-entity'
import { AuditEventDomainCreateModel, AuditEventDomainModel } from '../../@types'

type AuditEventEntityToDomainOptions = Partial<{}>

export const AuditEventEntityToDomain = ModelMapper<
  AuditEventEntityModel,
  AuditEventDomainModel,
  AuditEventEntityToDomainOptions
>((entity, options) => {
  const { id, recorded, lat, lng, speed, heading, accuracy, altitude, charge, ...domain } = entity
  return { telemetry: { gps: { lat, lng, speed, heading, accuracy, altitude }, charge }, ...domain }
})

type AuditEventEntityCreateOptions = Partial<{
  recorded: Timestamp
}>

export type AuditEventEntityCreateModel = Omit<
  Optional<AuditEventEntityModel, keyof RecordedColumn>,
  keyof IdentityColumn
>

export const AuditEventDomainToEntityCreate = ModelMapper<
  AuditEventDomainCreateModel,
  AuditEventEntityCreateModel,
  AuditEventEntityCreateOptions
>(({ audit_issue_code = null, note = null, telemetry, ...domain }, options) => {
  const {
    charge = null,
    gps: { lat, lng, speed = null, heading = null, accuracy = null, altitude = null }
  } = telemetry
  const { recorded } = options ?? {}
  return { audit_issue_code, note, lat, lng, speed, heading, accuracy, altitude, charge, ...domain, recorded }
})
