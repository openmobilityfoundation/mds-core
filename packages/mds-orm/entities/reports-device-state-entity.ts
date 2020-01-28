import { Entity } from 'typeorm'
import { RecordedEntity } from './recorded-entity'

@Entity('reports_device_states')
export class ReportsDeviceStateEntity extends RecordedEntity {}
