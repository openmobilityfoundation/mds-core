import { Entity, Column } from 'typeorm'
import { IdentityColumn, RecordedColumn } from '@mds-core/mds-repository'
import { DeviceDomainModel } from '../../@types'

export interface DeviceEntityModel extends IdentityColumn, RecordedColumn {
  device_id: DeviceDomainModel['device_id']
  provider_id: DeviceDomainModel['provider_id']
  vehicle_id: DeviceDomainModel['vehicle_id']
  type: DeviceDomainModel['type']
  propulsion: DeviceDomainModel['propulsion']
  year: DeviceDomainModel['year']
  mfgr: DeviceDomainModel['mfgr']
  model: DeviceDomainModel['model']
}

@Entity('devices')
export class DeviceEntity extends IdentityColumn(RecordedColumn(class {})) implements DeviceEntityModel {
  @Column('uuid', { primary: true })
  device_id: DeviceEntityModel['device_id']

  @Column('uuid')
  provider_id: DeviceEntityModel['provider_id']

  @Column('varchar', { length: 255 })
  vehicle_id: DeviceEntityModel['vehicle_id']

  @Column('varchar', { length: 31 })
  type: DeviceEntityModel['type']

  @Column('varchar', { array: true, length: 31 })
  propulsion: DeviceEntityModel['propulsion']

  @Column('smallint', { nullable: true })
  year: DeviceEntityModel['year']

  @Column('varchar', { length: 127, nullable: true })
  mfgr: DeviceEntityModel['mfgr']

  @Column('varchar', { length: 127, nullable: true })
  model: DeviceEntityModel['model']
}
