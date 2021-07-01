/**
 * Copyright 2020 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { InsertReturning, ReadWriteRepository, RepositoryError } from '@mds-core/mds-repository'
import { schemaValidator } from '@mds-core/mds-schema-validators'
import { UUID } from '@mds-core/mds-types'
import { NotFoundError } from '@mds-core/mds-utils'
import Joi from 'joi'
import { Between, Brackets, FindOperator, In, LessThan, MoreThan } from 'typeorm'
import { buildPaginator, Cursor } from 'typeorm-cursor-pagination'
import {
  FEE_TYPE,
  SORTABLE_COLUMN,
  SORT_DIRECTION,
  TransactionDomainModel,
  TransactionOperationDomainModel,
  TransactionSearchParams,
  TransactionStatusDomainModel
} from '../@types'
import { TransactionOperationEntity } from './entities/operation-entity'
import { TransactionStatusEntity } from './entities/status-entity'
import { TransactionEntity } from './entities/transaction-entity'
import {
  TransactionDomainToEntityCreate,
  TransactionEntityToDomain,
  TransactionOperationDomainToEntityCreate,
  TransactionOperationEntityToDomain,
  TransactionStatusDomainToEntityCreate,
  TransactionStatusEntityToDomain
} from './mappers'
import migrations from './migrations'

/**
 * Aborts execution if not running under a test environment.
 */
const testEnvSafeguard = () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(`This method is only supported when executing tests`)
  }
}

const { validate: validateTransactionSearchParams } = schemaValidator<TransactionSearchParams>(
  Joi.object<TransactionSearchParams>()
    .keys({
      provider_id: Joi.string().uuid(),
      start_timestamp: Joi.number().integer(),
      end_timestamp: Joi.number().integer(),
      search_text: Joi.string(),
      start_amount: Joi.number(),
      end_amount: Joi.number(),
      fee_type: Joi.string().allow(...FEE_TYPE),
      before: Joi.string(),
      after: Joi.string(),
      limit: Joi.number().integer().min(1).max(1000).default(10),
      order: Joi.object<TransactionSearchParams['order']>().keys({
        column: Joi.string().allow(...SORTABLE_COLUMN),
        direction: Joi.string().allow(...SORT_DIRECTION)
      })
    })
    .unknown(false)
)

class TransactionReadWriteRepository extends ReadWriteRepository {
  public getTransaction = async (transaction_id: UUID): Promise<TransactionDomainModel> => {
    const { connect } = this
    try {
      const connection = await connect('ro')
      const entity = await connection.getRepository(TransactionEntity).findOne({
        where: {
          transaction_id
        }
      })
      if (!entity) {
        throw new NotFoundError(`Transaction ${transaction_id} not found`)
      }
      return TransactionEntityToDomain.map(entity)
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  // TODO search criteria
  public getTransactions = async (
    search: TransactionSearchParams
  ): Promise<{ transactions: TransactionDomainModel[]; cursor: Cursor }> => {
    const { connect } = this
    const {
      provider_id,
      start_timestamp,
      end_timestamp,
      search_text,
      start_amount,
      end_amount,
      fee_type,
      before,
      after,
      limit,
      order
    } = validateTransactionSearchParams(search)

    const resolveTimeBounds = (): { timestamp?: FindOperator<number> } => {
      if (start_timestamp && end_timestamp) {
        return { timestamp: Between(start_timestamp, end_timestamp) }
      }
      if (start_timestamp) {
        return { timestamp: MoreThan(start_timestamp) }
      }
      if (end_timestamp) {
        return { timestamp: LessThan(end_timestamp) }
      }
      return {}
    }

    const jsonSearch = (alias: string) => {
      /**
       * 'simple' means no word-stemming, all words are indexed and searchable.
       * ['string','numeric','boolean'] means all values of the JSONB column are being searched as text
       */
      return search_text
        ? new Brackets(qb =>
            qb.where(
              `jsonb_to_tsvector('simple',${alias}.receipt,'["string","numeric","boolean"]') @@ to_tsquery(:search_text)`,
              {
                search_text: search_text + ':*'
              }
            )
          )
        : []
    }

    const resolveProviderId = (): { provider_id?: UUID } => (provider_id ? { provider_id } : {})

    const resolveConditions = (alias: string) => {
      const clauses = [
        start_amount ? new Brackets(qb => qb.where(`amount > :start_amount`, { start_amount })) : [],
        end_amount ? new Brackets(qb => qb.where(`amount < :end_amount`, { end_amount })) : [],
        fee_type ? new Brackets(qb => qb.where({ fee_type })) : [],
        jsonSearch(alias)
      ]

      return clauses.flat().reduce((acc, clause) => {
        return new Brackets(qb => qb.andWhere(acc).andWhere(clause))
      }, new Brackets(qb => qb.where('1=1')))
    }

    try {
      const connection = await connect('ro')

      /**
       * Need to generate a shared alias due to the different aliasing methods in TypeORM & TypeORM Cursor Paginator
       * depending on debug vs production environments.
       */
      const alias = 'transactionentity'

      const queryBuilder = connection
        .getRepository(TransactionEntity)
        .createQueryBuilder(alias)
        .where({ ...resolveProviderId(), ...resolveTimeBounds() })
        .andWhere(resolveConditions(alias))

      const { data, cursor } = await buildPaginator({
        alias,
        entity: TransactionEntity,
        query: {
          limit,
          order: order?.direction ?? 'ASC',
          afterCursor: after,
          beforeCursor: after ? undefined : before
        },
        paginationKeys: [order?.column ?? 'id']
      }).paginate(queryBuilder)
      return { transactions: data.map(TransactionEntityToDomain.mapper()), cursor }
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  public createTransaction = async (transaction: TransactionDomainModel): Promise<TransactionDomainModel> => {
    const { connect } = this
    try {
      const connection = await connect('rw')
      const {
        raw: [entity]
      }: InsertReturning<TransactionEntity> = await connection
        .getRepository(TransactionEntity)
        .createQueryBuilder()
        .insert()
        .values([TransactionDomainToEntityCreate.map(transaction)])
        .returning('*')
        .execute()
      return TransactionEntityToDomain.map(entity)
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  public createTransactions = async (transactions: TransactionDomainModel[]): Promise<TransactionDomainModel[]> => {
    const { connect } = this
    try {
      const connection = await connect('rw')
      const { raw: entities }: InsertReturning<TransactionEntity> = await connection
        .getRepository(TransactionEntity)
        .createQueryBuilder()
        .insert()
        .values(transactions.map(TransactionDomainToEntityCreate.mapper()))
        .returning('*')
        .execute()
      return entities.map(TransactionEntityToDomain.map)
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  public addTransactionOperation = async (
    transactionOperation: TransactionOperationDomainModel
  ): Promise<TransactionOperationDomainModel> => {
    const { connect } = this
    try {
      const connection = await connect('rw')
      const {
        raw: [entity]
      }: InsertReturning<TransactionOperationEntity> = await connection
        .getRepository(TransactionOperationEntity)
        .createQueryBuilder()
        .insert()
        .values([TransactionOperationDomainToEntityCreate.map(transactionOperation)])
        .returning('*')
        .execute()
      return TransactionOperationEntityToDomain.map(entity)
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  // TODO search criteria, paging
  public getTransactionOperations = async (transaction_id: UUID): Promise<TransactionOperationDomainModel[]> => {
    const { connect } = this
    try {
      const connection = await connect('ro')
      const entities = await connection.getRepository(TransactionOperationEntity).find({ where: { transaction_id } })
      return entities.map(TransactionOperationEntityToDomain.mapper())
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  public setTransactionStatus = async (
    transactionStatus: TransactionStatusDomainModel
  ): Promise<TransactionStatusDomainModel> => {
    const { connect } = this
    try {
      const connection = await connect('rw')
      const {
        raw: [entity]
      }: InsertReturning<TransactionStatusEntity> = await connection
        .getRepository(TransactionStatusEntity)
        .createQueryBuilder()
        .insert()
        .values([TransactionStatusDomainToEntityCreate.map(transactionStatus)])
        .returning('*')
        .execute()
      return TransactionStatusEntityToDomain.map(entity)
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  // TODO search criteria, paging
  public getTransactionStatuses = async (transaction_id: UUID): Promise<TransactionStatusDomainModel[]> => {
    const { connect } = this
    try {
      const connection = await connect('ro')
      const entities = await connection.getRepository(TransactionStatusEntity).find({ where: { transaction_id } })
      return entities.map(TransactionStatusEntityToDomain.mapper())
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  public getTransactionsStatuses = async (
    transaction_ids: UUID[]
  ): Promise<Record<UUID, TransactionStatusDomainModel[]>> => {
    const { connect } = this
    try {
      const connection = await connect('ro')
      const entities: { transaction_id: UUID; statuses: TransactionStatusEntity[] }[] = await connection
        .getRepository(TransactionStatusEntity)
        .createQueryBuilder()
        .select('transaction_id, ARRAY_AGG(row_to_json("TransactionStatusEntity".*)) as statuses')
        .where({ transaction_id: In(transaction_ids) })
        .groupBy(`transaction_id`)
        .execute()

      // Map the statuses within the object to their domain models
      return entities.reduce<Record<UUID, TransactionStatusDomainModel[]>>((acc, { transaction_id, statuses }) => {
        const mappedStatuses = statuses.map(TransactionStatusEntityToDomain.mapper())
        return { ...acc, [transaction_id]: mappedStatuses }
      }, {})
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  /**
   * @deprecated
   * **WARNING: This should ONLY be used during tests! Hence adding the deprecated flag.**
   * Deletes all transactions from the DB.
   */
  public deleteAllTransactions = async () => {
    testEnvSafeguard()
    const { connect } = this
    try {
      const connection = await connect('rw')
      const repository = await connection.getRepository(TransactionEntity)

      await repository.query(`DELETE FROM ${repository.metadata.tableName};`)
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  /**
   * @deprecated
   * **WARNING: This should ONLY be used during tests! Hence adding the deprecated flag.**
   * Deletes all transaction operations from the DB.
   */
  public deleteAllTransactionOperations = async () => {
    testEnvSafeguard()
    const { connect } = this
    try {
      const connection = await connect('rw')
      const repository = await connection.getRepository(TransactionOperationEntity)

      await repository.query(`DELETE FROM ${repository.metadata.tableName};`)
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  /**
   * @deprecated
   * **WARNING: This should ONLY be used during tests! Hence adding the deprecated flag.**
   * Deletes all transaction statuses from the DB.
   */
  public deleteAllTransactionStatuses = async () => {
    testEnvSafeguard()
    const { connect } = this
    try {
      const connection = await connect('rw')
      const repository = await connection.getRepository(TransactionStatusEntity)

      await repository.query(`DELETE FROM ${repository.metadata.tableName};`)
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  constructor() {
    super('transactions', {
      entities: [TransactionEntity, TransactionOperationEntity, TransactionStatusEntity],
      migrations
    })
  }
}

export const TransactionRepository = new TransactionReadWriteRepository()
