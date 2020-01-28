import { Entity } from 'typeorm'
import { IdentityEntity } from './identity-entity'

@Entity('policy_metadata')
export class PolicyMetadataEntity extends IdentityEntity {}
