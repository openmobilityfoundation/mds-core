import { Entity } from 'typeorm'
import { RecordedEntity } from './recorded-entity'

@Entity('events')
export class VehicleEventEntity extends RecordedEntity {}
