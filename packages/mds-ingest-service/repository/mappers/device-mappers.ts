import { Timestamp } from '@mds-core/mds-types'
import { IdentityColumn, ModelMapper, RecordedColumn } from '@mds-core/mds-repository'
import { DeviceEntityModel } from '../entities/device-entity'
import { DeviceDomainCreateModel, DeviceDomainModel } from '../../@types'

type DeviceEntityToDomainOptions = Partial<{}>

export const DeviceEntityToDomain = ModelMapper<DeviceEntityModel, DeviceDomainModel, DeviceEntityToDomainOptions>(
  (entity, options) => {
    const { id, ...domain } = entity
    return { ...domain }
  }
)

type DeviceEntityCreateOptions = Partial<{
  recorded: Timestamp
}>

export type DeviceEntityCreateModel = Omit<DeviceEntityModel, keyof IdentityColumn | keyof RecordedColumn>

export const DeviceDomainToEntityCreate = ModelMapper<
  DeviceDomainCreateModel,
  DeviceEntityCreateModel,
  DeviceEntityCreateOptions
>(({ year = null, mfgr = null, model = null, ...domain }, options) => {
  const { recorded } = options ?? {}
  return { year, mfgr, model, recorded, ...domain }
})
