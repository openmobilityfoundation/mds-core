import { ConnectionManager } from '@mds-core/mds-orm'
import { UUID } from '@mds-core/mds-types'
import { InsertReturning, UpdateReturning } from '@mds-core/mds-orm/types'
import { DeepPartial } from 'typeorm'
import ormconfig from './ormconfig'
import { JurisdictionEntity } from './entities'

const manager = ConnectionManager(ormconfig)

export const initialize = async () => manager.initialize()

export const readJurisdiction = async (jurisdiction_id: UUID): Promise<JurisdictionEntity | undefined> => {
  const connection = await manager.getReadWriteConnection()
  return connection.getRepository(JurisdictionEntity).createQueryBuilder().where({ jurisdiction_id }).getOne()
}

export const readJurisdictions = async (): Promise<JurisdictionEntity[]> => {
  const connection = await manager.getReadWriteConnection()
  const entities = await connection.getRepository(JurisdictionEntity).createQueryBuilder().getMany()
  return entities
}

export const writeJurisdictions = async (
  jurisdictions: DeepPartial<JurisdictionEntity>[]
): Promise<JurisdictionEntity[]> => {
  const connection = await manager.getReadWriteConnection()
  const { raw: entities }: InsertReturning<JurisdictionEntity> = await connection
    .getRepository(JurisdictionEntity)
    .createQueryBuilder()
    .insert()
    .values(jurisdictions)
    .returning('*')
    .execute()
  return entities
}

export const updateJurisdiction = async (
  jurisdiction_id: UUID,
  { id, ...jurisdiction }: JurisdictionEntity
): Promise<JurisdictionEntity> => {
  const connection = await manager.getReadWriteConnection()
  const {
    raw: [entity]
  }: UpdateReturning<JurisdictionEntity> = await connection
    .getRepository(JurisdictionEntity)
    .createQueryBuilder()
    .update()
    .set(jurisdiction)
    .where('jurisdiction_id = :jurisdiction_id', { jurisdiction_id })
    .returning('*')
    .execute()
  return entity
}

export const shutdown = async () => manager.shutdown()
