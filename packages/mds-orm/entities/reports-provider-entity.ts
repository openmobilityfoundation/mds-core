import { Entity } from 'typeorm'
import { RecordedEntity } from './recorded-entity'

@Entity('reports_providers')
export class ReportsProviderEntity extends RecordedEntity {}
