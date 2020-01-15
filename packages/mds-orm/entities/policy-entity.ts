import { Entity } from 'typeorm'
import { IdentityEntity } from './identity-entity'

@Entity('policies')
export class PolicyEntity extends IdentityEntity {}
