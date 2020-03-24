import { ConnectionManager } from '@mds-core/mds-orm'
import { UUID } from '@mds-core/mds-types'
import logger from '@mds-core/mds-logger'
import { ServerError } from '@mds-core/mds-utils'
import { InsertReturning, UpdateReturning } from '@mds-core/mds-orm/types'
import { DeepPartial } from 'typeorm'
import ormconfig from './ormconfig'
import { JurisdictionEntity } from './entities'

const manager = ConnectionManager(ormconfig)

export const initialize = async () => manager.initialize()

export const readJurisdiction = async (jurisdiction_id: UUID): Promise<JurisdictionEntity | undefined> => {
  const connection = await manager.getReadWriteConnection()
  try {
    const entity = await connection
      .getRepository(JurisdictionEntity)
      .createQueryBuilder()
      .where({ jurisdiction_id })
      .getOne()
    return entity
  } catch (error) {
    await logger.error('readJurisdiction', { jurisdiction_id }, error)
    throw new ServerError('Error Reading Jurisdiction', { jurisdiction_id })
  }
}

export const readJurisdictions = async (): Promise<JurisdictionEntity[]> => {
  const connection = await manager.getReadWriteConnection()
  try {
    const entities = await connection.getRepository(JurisdictionEntity).createQueryBuilder().getMany()
    return entities
  } catch (error) {
    await logger.error('readJurisdictions', error)
    throw new ServerError('Error Reading Jurisdictions')
  }
}

export const writeJurisdictions = async (
  jurisdictions: DeepPartial<JurisdictionEntity>[]
): Promise<JurisdictionEntity[]> => {
  const connection = await manager.getReadWriteConnection()
  try {
    const { raw: entities }: InsertReturning<JurisdictionEntity> = await connection
      .getRepository(JurisdictionEntity)
      .createQueryBuilder()
      .insert()
      .values(jurisdictions)
      .returning('*')
      .execute()
    return entities
  } catch (error) {
    await logger.error('writeJurisdictions', error)
    throw new ServerError('Error Writing Jurisdictions')
  }
}

export const updateJurisdiction = async (
  jurisdiction_id: UUID,
  { id, ...jurisdiction }: JurisdictionEntity
): Promise<JurisdictionEntity> => {
  const connection = await manager.getReadWriteConnection()
  try {
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
  } catch (error) {
    await logger.error('updateJurisdiction', { jurisdiction_id, jurisdiction }, error)
    throw new ServerError('Error Updating Jurisdiction', { jurisdiction_id })
  }
}

export const shutdown = async () => manager.shutdown()
