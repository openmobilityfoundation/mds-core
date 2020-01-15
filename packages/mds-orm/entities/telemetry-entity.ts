import { Entity } from 'typeorm'
import { RecordedEntity } from './recorded-entity'

@Entity('telemetry')
export class TelemetryEntity extends RecordedEntity {}
