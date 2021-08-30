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
import { Timestamp, UUID } from '@mds-core/mds-types'
import { ConflictError, NotFoundError, now, testEnvSafeguard } from '@mds-core/mds-utils'
import {
  PolicyDomainCreateModel,
  PolicyDomainModel,
  PolicyMetadataDomainModel,
  POLICY_STATUS,
  PresentationOptions,
  ReadPolicyQueryParams
} from '../@types'
import entities from './entities'
import { PolicyEntity } from './entities/policy-entity'
import { PolicyMetadataEntity } from './entities/policy-metadata-entity'
import {
  PolicyDomainToEntityCreate,
  PolicyEntityToDomain,
  PolicyMetadataDomainToEntityCreate,
  PolicyMetadataEntityToDomain
} from './mappers'
import migrations from './migrations'

class PolicyReadWriteRepository extends ReadWriteRepository {
  constructor() {
    super('policies', { entities, migrations })
  }

  public readPolicies = async (params: ReadPolicyQueryParams = {}, presentationOptions: PresentationOptions = {}) => {
    const { policy_ids, rule_id, get_unpublished, get_published, start_date, geography_ids, statuses } = params

    try {
      const connection = await this.connect('ro')
      const query = connection.getRepository(PolicyEntity).createQueryBuilder()

      if (policy_ids) {
        query.andWhere('policy_id = ANY(:policy_ids)', { policy_ids })
      }

      if (rule_id) {
        query.andWhere(
          "EXISTS(SELECT FROM json_array_elements(policy_json->'rules') elem WHERE (elem->'rule_id')::jsonb ? :rule_id)",
          { rule_id }
        )
      }

      if (get_unpublished) {
        query.andWhere("policy_json->>'publish_date' IS NULL")
      }

      if (get_published) {
        query.andWhere("policy_json->>'publish_date' IS NOT NULL")
      }

      if (start_date) {
        query.andWhere("policy_json->>'start_date' >= :start_date", { start_date })
      }

      if (geography_ids) {
        query.andWhere(
          `array( select json_array_elements_text(json_array_elements(policy_json->'rules')->'geographies')) && :geography_ids`,
          { geography_ids }
        )
      }

      if (statuses) {
        /** Turns statuses into expressions with params */
        const statusToExpressionWithParams: {
          [key in Exclude<POLICY_STATUS, 'unknown'>]: { expression: string; params?: object }
        } = {
          draft: { expression: "policy_json->>'publish_date' IS NULL" },
          deactivated: { expression: 'superseded_by IS NOT NULL AND array_length(superseded_by, 1) >= 1' },
          expired: {
            expression: "policy_json->>'end_date' IS NOT NULL AND policy_json->>'end_date' <= :now",
            params: { now: now() }
          },
          pending: {
            expression:
              "policy_json->>'publish_date' IS NOT NULL AND policy_json->>'publish_date' <= :now AND policy_json->>'start_date' >= :now",
            params: { now: now() }
          },
          active: {
            expression:
              "policy_json->>'start_date' IS NOT NULL AND policy_json->>'start_date' <= :now AND policy_json->>'publish_date' IS NOT NULL AND policy_json->>'publish_date' <= :now",
            params: { now: now() }
          }
        }

        const expressionsWithParams = statuses.map(status => statusToExpressionWithParams[status])

        if (expressionsWithParams.length === 1) {
          const [{ expression, params }] = expressionsWithParams
          query.andWhere(expression, params)
        } else {
          const { expressions, params } = expressionsWithParams.reduce<{ expressions: string[]; params: object }>(
            ({ expressions, params: paramsList }, { expression, params }) => {
              return { expressions: [...expressions, expression], params: { ...paramsList, ...params } }
            },
            { expressions: [], params: {} }
          )
          query.andWhere(`(${expressions.join(' OR ')})`, params)
        }
      }

      const entities = await query.getMany()
      return entities.map(entity => PolicyEntityToDomain.map(entity, presentationOptions))
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  public readActivePolicies = async (timestamp: Timestamp = now()) => {
    try {
      const connection = await this.connect('ro')
      const entities = await connection
        .getRepository(PolicyEntity)
        .createQueryBuilder()
        .where("policy_json->>'start_date' >= :start_date", { start_date: timestamp })
        .andWhere("policy_json->>'end_date' <= :end_date OR policy_json->>'end_date' IS NULL ", { end_date: timestamp })
        .andWhere("policy_json->>'publish_date' IS NOT NULL AND policy_json->>'publish_date' <= :publish_date ", {
          publish_date: timestamp
        })
        .getMany()
      return entities.map(entity => PolicyEntityToDomain.map(entity))
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  public readBulkPolicyMetadata = async <M>(params: ReadPolicyQueryParams = {}) => {
    const policies = await this.readPolicies(params)

    if (policies.length === 0) {
      return []
    }

    const connection = await this.connect('ro')
    const entities = await connection
      .getRepository(PolicyMetadataEntity)
      .createQueryBuilder()
      .andWhere('policy_id = ANY(:policy_ids)', { policy_ids: policies.map(p => p.policy_id) })
      .getMany()

    return entities.map(PolicyMetadataEntityToDomain.map) as PolicyMetadataDomainModel<M>[]
  }

  public readSinglePolicyMetadata = async (policy_id: UUID) => {
    try {
      const connection = await this.connect('ro')
      const entity = await connection.getRepository(PolicyMetadataEntity).findOneOrFail({ policy_id })
      return PolicyMetadataEntityToDomain.map(entity)
    } catch (error) {
      if (error.name === 'EntityNotFound') {
        throw new NotFoundError(error)
      }
      throw RepositoryError(error)
    }
  }

  public readPolicy = async (policy_id: UUID, presentationOptions: PresentationOptions = {}) => {
    try {
      const connection = await this.connect('ro')
      const entity = await connection.getRepository(PolicyEntity).findOneOrFail({ policy_id })
      return PolicyEntityToDomain.map(entity, presentationOptions)
    } catch (error) {
      if (error.name === 'EntityNotFound') {
        throw new NotFoundError(error)
      }
      throw RepositoryError(error)
    }
  }

  private throwIfRulesAlreadyExist = async (policy: PolicyDomainCreateModel) => {
    const policies = await Promise.all(policy.rules.map(({ rule_id }) => this.readPolicies({ rule_id })))
    const policyIds = policies.flat().map(({ policy_id }) => policy_id)

    if (policyIds.some(policy_id => policy_id !== policy.policy_id)) {
      throw new ConflictError(`Policies containing rules with the same id or ids already exist`)
    }
  }

  public writePolicy = async (policy: PolicyDomainCreateModel): Promise<PolicyDomainModel> => {
    await this.throwIfRulesAlreadyExist(policy)
    try {
      const connection = await this.connect('rw')
      const {
        raw: [entity]
      }: InsertReturning<PolicyEntity> = await connection
        .getRepository(PolicyEntity)
        .createQueryBuilder()
        .insert()
        .values(PolicyDomainToEntityCreate.map(policy))
        .returning('*')
        .execute()
      return PolicyEntityToDomain.map(entity)
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  public isPolicyPublished = async (policy_id: UUID) => {
    try {
      const connection = await this.connect('ro')
      const entity = await connection.getRepository(PolicyEntity).findOneOrFail({ policy_id })
      if (!entity) {
        return false
      }
      return Boolean(PolicyEntityToDomain.map(entity).publish_date)
    } catch (error) {
      if (error.name === 'EntityNotFound') {
        throw new NotFoundError(error)
      }
      throw RepositoryError(error)
    }
  }

  public editPolicy = async (policy: PolicyDomainCreateModel) => {
    const { policy_id } = policy

    if (await this.isPolicyPublished(policy_id)) {
      throw new ConflictError('Cannot edit published policy')
    }

    const result = await this.readPolicies({ policy_ids: [policy_id], get_unpublished: true, get_published: false })
    if (result.length === 0) {
      throw new NotFoundError(`no policy of id ${policy_id} was found`)
    }
    await this.throwIfRulesAlreadyExist(policy)
    try {
      const connection = await this.connect('rw')
      const {
        raw: [updated]
      } = await connection
        .getRepository(PolicyEntity)
        .createQueryBuilder()
        .update()
        .set({ policy_json: { ...policy } })
        .where('policy_id = :policy_id', { policy_id })
        .andWhere("policy_json->>'publish_date' IS NULL")
        .returning('*')
        .execute()
      return PolicyEntityToDomain.map(updated)
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  public deletePolicy = async (policy_id: UUID) => {
    if (await this.isPolicyPublished(policy_id)) {
      throw new ConflictError('Cannot edit published Policy')
    }

    try {
      const connection = await this.connect('rw')
      const {
        raw: [deleted]
      } = await connection
        .getRepository(PolicyEntity)
        .createQueryBuilder()
        .delete()
        .where('policy_id = :policy_id', { policy_id })
        .andWhere("policy_json->>'publish_date' IS NULL")
        .returning('*')
        .execute()
      return PolicyEntityToDomain.map(deleted).policy_id
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  /* Only publish the policy if the geographies are successfully published first */
  public publishPolicy = async (policy_id: UUID, publish_date = now()) => {
    try {
      if (await this.isPolicyPublished(policy_id)) {
        throw new ConflictError('Cannot re-publish existing policy')
      }

      const policy = (
        await this.readPolicies({ policy_ids: [policy_id], get_unpublished: true, get_published: null })
      )[0]
      if (!policy) {
        throw new NotFoundError('cannot publish nonexistent policy')
      }

      if (policy.start_date < publish_date) {
        throw new ConflictError('Policies cannot be published after their start_date')
      }

      const published_policy: PolicyDomainModel = { ...policy, publish_date }
      try {
        const connection = await this.connect('rw')
        const {
          raw: [updated]
        } = await connection
          .getRepository(PolicyEntity)
          .createQueryBuilder()
          .update()
          .set({ policy_json: { ...published_policy } })
          .where('policy_id = :policy_id', { policy_id })
          .andWhere("policy_json->>'publish_date' IS NULL")
          .returning('*')
          .execute()
        return PolicyEntityToDomain.map(updated)
      } catch (error) {
        throw RepositoryError(error)
      }
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  public writePolicyMetadata = async (policy_metadata: PolicyMetadataDomainModel) => {
    try {
      const connection = await this.connect('rw')
      const {
        raw: [entity]
      }: InsertReturning<PolicyMetadataEntity> = await connection
        .getRepository(PolicyMetadataEntity)
        .createQueryBuilder()
        .insert()
        .values(PolicyMetadataDomainToEntityCreate.map(policy_metadata))
        .returning('*')
        .execute()
      return PolicyMetadataEntityToDomain.map(entity)
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  public updatePolicyMetadata = async <M>(metadata: PolicyMetadataDomainModel<M>) => {
    try {
      const { policy_id, policy_metadata } = metadata
      await this.readSinglePolicyMetadata(policy_id)

      const connection = await this.connect('rw')
      const {
        raw: [updated]
      } = await connection
        .getRepository(PolicyMetadataEntity)
        .createQueryBuilder()
        .update()
        .set({ policy_metadata })
        .where('policy_id = :policy_id', { policy_id })
        .returning('*')
        .execute()
      return PolicyMetadataEntityToDomain.map(updated) as PolicyMetadataDomainModel<M>
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  public readRule = async (rule_id: UUID) => {
    try {
      const connection = await this.connect('rw')
      const policy = await connection
        .getRepository(PolicyEntity)
        .createQueryBuilder()
        .select()
        .where(
          "EXISTS (SELECT FROM json_array_elements(policy_json->'rules') elem WHERE (elem->'rule_id')::jsonb ? :rule_id) ",
          { rule_id }
        )
        .getOneOrFail()
      return PolicyEntityToDomain.map(policy).rules.filter(r => r.rule_id === rule_id)
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  /**
   * @param {UUID} policy_id policy_id which is being superseded
   * @param {UUID} superseding_policy_id policy_id which is superseding the original policy_id
   */
  public updatePolicySupersededByColumn = async (policy_id: UUID, superseding_policy_id: UUID) => {
    try {
      const connection = await this.connect('rw')

      const { superseded_by } = await connection.getRepository(PolicyEntity).findOneOrFail({ policy_id })

      const updatedSupersededBy = superseded_by ? [...superseded_by, superseding_policy_id] : [superseding_policy_id]

      const {
        raw: [updated]
      } = await connection
        .getRepository(PolicyEntity)
        .createQueryBuilder()
        .update()
        .set({ superseded_by: updatedSupersededBy })
        .where('policy_id = :policy_id', { policy_id })
        .returning('*')
        .execute()

      return PolicyEntityToDomain.map(updated)
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  public deleteAll = async () => {
    testEnvSafeguard()
    try {
      const connection = await this.connect('rw')
      await connection.getRepository(PolicyEntity).query('TRUNCATE policies, policy_metadata RESTART IDENTITY')
    } catch (error) {
      throw RepositoryError(error)
    }
  }
}

export const PolicyRepository = new PolicyReadWriteRepository()
