import { Entity } from 'typeorm'
import { RecordedEntity } from './recorded-entity'

@Entity('stops')
export class StopEntity extends RecordedEntity {}
