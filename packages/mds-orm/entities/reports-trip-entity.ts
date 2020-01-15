import { Entity } from 'typeorm'
import { RecordedEntity } from './recorded-entity'

@Entity('reports_trips')
export class ReportsTripEntity extends RecordedEntity {}
