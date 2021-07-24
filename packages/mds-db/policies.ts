/**
 * Copyright 2019 City of Los Angeles
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

import logger from '@mds-core/mds-logger'
import {
  ModalityPolicy,
  Nullable,
  PolicyMetadata,
  PolicyTypeInfo,
  Recorded,
  Timestamp,
  UUID
} from '@mds-core/mds-types'
import {
  AlreadyPublishedError,
  BadParamsError,
  ConflictError,
  DependencyMissingError,
  NotFoundError,
  now
} from '@mds-core/mds-utils'
import { getReadOnlyClient, getWriteableClient } from './client'
import { isGeographyPublished } from './geographies'
import schema from './schema'
import { cols_sql, SqlVals, vals_list, vals_sql } from './sql-utils'

export async function readPolicies<PInfo extends PolicyTypeInfo>(params?: {
  policy_id?: UUID
  rule_id?: UUID
  name?: string
  description?: string
  start_date?: Timestamp
  get_unpublished?: Nullable<boolean>
  get_published?: Nullable<boolean>
}): Promise<PInfo['Policy'][]> {
  // use params to filter
  // query
  // return policies
  const client = await getReadOnlyClient()

  // TODO more params
  let sql = `select * from ${schema.TABLE.policies}`
  const conditions = []
  const vals = new SqlVals()
  if (params) {
    if (params.policy_id) {
      conditions.push(`policy_id = ${vals.add(params.policy_id)}`)
    }

    if (params.rule_id) {
      conditions.push(
        `EXISTS(SELECT FROM json_array_elements(policy_json->'rules') elem WHERE (elem->'rule_id')::jsonb ? '${params.rule_id}')`
      )
    }

    if (params.get_unpublished) {
      conditions.push(`policy_json->>'publish_date' IS NULL`)
    }

    if (params.get_published) {
      conditions.push(`policy_json->>'publish_date' IS NOT NULL`)
    }

    if (params.get_unpublished && params.get_published) {
      throw new BadParamsError('cannot have get_unpublished and get_published both be true')
    }

    if (params.start_date) {
      conditions.push(`policy_json->>'start_date' >= '${params.start_date}'`)
    }
  }

  if (conditions.length) {
    sql += ` WHERE ${conditions.join(' AND ')}`
  }
  const values = vals.values()
  const res = await client.query(sql, values)
  return res.rows.map(row => row.policy_json)
}

export async function readActivePolicies<PInfo extends PolicyTypeInfo>(
  timestamp: Timestamp = now()
): Promise<PInfo['Policy'][]> {
  const client = await getReadOnlyClient()
  const conditions = []
  const vals = new SqlVals()
  conditions.push(`policy_json->>'start_date' <= ${vals.add(timestamp)}`)
  conditions.push(`(policy_json->>'end_date' >= ${vals.add(timestamp)} OR policy_json->>'end_date' IS NULL)`)
  conditions.push(
    `(policy_json->>'publish_date' IS NOT NULL AND policy_json->>'publish_date' <= ${vals.add(timestamp)})`
  )
  const sql = `select * from ${schema.TABLE.policies} WHERE ${conditions.join(' AND ')}`
  const values = vals.values()
  const res = await client.query(sql, values)
  return res.rows.map(row => row.policy_json)
}

export async function readBulkPolicyMetadata(params?: {
  policy_id?: UUID
  name?: string
  description?: string
  start_date?: Timestamp
  get_unpublished: Nullable<boolean>
  get_published: Nullable<boolean>
}): Promise<PolicyMetadata[]> {
  const policies = await readPolicies(params)
  const policy_ids = policies.map(policy => {
    return `'${policy.policy_id}'`
  })

  if (policy_ids.length === 0) {
    return []
  }
  const sql = `select * from ${schema.TABLE.policy_metadata} where policy_id in (${policy_ids.join(',')})`

  const client = await getReadOnlyClient()
  const res = await client.query(sql)
  return res.rows.map(row => {
    return { policy_id: row.policy_id, policy_metadata: row.policy_metadata }
  })
}

export async function readSinglePolicyMetadata(policy_id: UUID): Promise<PolicyMetadata> {
  const client = await getReadOnlyClient()

  const sql = `select * from ${schema.TABLE.policy_metadata} where policy_id = '${policy_id}'`
  const res = await client.query(sql)
  if (res.rows.length === 1) {
    const { policy_metadata } = res.rows[0]
    return { policy_id, policy_metadata }
  }
  logger.info(`readSinglePolicyMetadata db failed for ${policy_id}: rows=${res.rows.length}`)
  throw new NotFoundError(`metadata for policy_id ${policy_id} not found`)
}

export async function readPolicy<PInfo extends PolicyTypeInfo>(policy_id: UUID): Promise<PInfo['Policy']> {
  const client = await getReadOnlyClient()

  const sql = `select * from ${schema.TABLE.policies} where policy_id = '${policy_id}'`
  const res = await client.query(sql)
  if (res.rows.length === 1) {
    return res.rows[0].policy_json
  }
  logger.info(`readPolicy db failed for ${policy_id}: rows=${res.rows.length}`)
  throw new NotFoundError(`policy_id ${policy_id} not found`)
}

async function throwIfRulesAlreadyExist<PInfo extends PolicyTypeInfo>(policy: PInfo['Policy']) {
  const unflattenedPolicies: PInfo['Policy'][][] = await Promise.all(
    policy.rules.map(rule => {
      return readPolicies<PInfo>({
        rule_id: rule.rule_id
      })
    })
  )

  unflattenedPolicies.map(policySubArr => {
    policySubArr.map(p => {
      if (p.policy_id !== policy.policy_id) {
        throw new ConflictError(`Policies containing rules with the same id or ids already exist`)
      }
    })
  })
}

export async function writePolicy<PInfo extends PolicyTypeInfo>(
  policy: PInfo['Policy']
): Promise<Recorded<PInfo['Policy']>> {
  // validate TODO
  const client = await getWriteableClient()
  await throwIfRulesAlreadyExist(policy)

  const sql = `INSERT INTO ${schema.TABLE.policies} (${cols_sql(schema.TABLE_COLUMNS.policies)}) VALUES (${vals_sql(
    schema.TABLE_COLUMNS.policies
  )}) RETURNING *`
  const values = vals_list(schema.TABLE_COLUMNS.policies, { ...policy, policy_json: policy })
  try {
    const {
      rows: [recorded_policy]
    }: { rows: Recorded<PInfo['Policy']>[] } = await client.query(sql, values)
    return { ...policy, ...recorded_policy }
  } catch (error) {
    if (error.code === '23505') {
      throw new ConflictError(`Policy ${policy.policy_id} already exists! Did you mean to PUT?`)
    } else {
      throw error
    }
  }
}

export async function isPolicyPublished(policy_id: UUID) {
  const client = await getReadOnlyClient()
  const sql = `SELECT * FROM ${schema.TABLE.policies} WHERE policy_id='${policy_id}'`
  const result = await client.query(sql)
  if (result.rows.length === 0) {
    return false
  }
  return Boolean(result.rows[0].policy_json.publish_date)
}

export async function editPolicy<PInfo extends PolicyTypeInfo>(policy: PInfo['Policy']) {
  const { policy_id } = policy

  if (await isPolicyPublished(policy_id)) {
    throw new AlreadyPublishedError('Cannot edit published policy')
  }

  const result = await readPolicies({ policy_id, get_unpublished: true, get_published: false })
  if (result.length === 0) {
    throw new NotFoundError(`no policy of id ${policy_id} was found`)
  }
  await throwIfRulesAlreadyExist(policy)
  const client = await getWriteableClient()
  const sql = `UPDATE ${schema.TABLE.policies} SET policy_json=$1 WHERE policy_id='${policy_id}' AND policy_json->>'publish_date' IS NULL`
  await client.query(sql, [policy])
  return policy
}

export async function deletePolicy(policy_id: UUID) {
  if (await isPolicyPublished(policy_id)) {
    throw new Error('Cannot edit published Geography')
  }

  const client = await getWriteableClient()
  const sql = `DELETE FROM ${schema.TABLE.policies} WHERE policy_id='${policy_id}' AND policy_json->>'publish_date' IS NULL`
  await client.query(sql)
  return policy_id
}

export async function publishPolicy(policy_id: UUID, publish_date = now()) {
  try {
    const client = await getWriteableClient()
    if (await isPolicyPublished(policy_id)) {
      throw new AlreadyPublishedError('Cannot re-publish existing policy')
    }

    const policy = (await readPolicies({ policy_id, get_unpublished: true, get_published: null }))[0]
    if (!policy) {
      throw new NotFoundError('cannot publish nonexistent policy')
    }

    if (policy.start_date < publish_date) {
      throw new ConflictError('Policies cannot be published after their start_date')
    }

    const geographies: UUID[] = []
    policy.rules.forEach(rule => {
      rule.geographies.forEach(geography_id => {
        geographies.push(geography_id)
      })
    })

    const unpublishedGeoIDs = await Promise.all(
      geographies.map(async geography_id => {
        const isPublished = await isGeographyPublished(geography_id)
        if (!isPublished) {
          return geography_id
        }
        return null
      })
    )

    unpublishedGeoIDs.forEach(id => {
      if (id) {
        throw new DependencyMissingError(`Geography with ${id} is not published!`)
      }
    })

    // Only publish the policy if the geographies are successfully published first
    const publishPolicySQL = `UPDATE ${schema.TABLE.policies}
     SET policy_json = policy_json::jsonb || '{"publish_date": ${publish_date}}'
     where policy_id='${policy_id}' RETURNING *`
    const {
      rows: [published_policy]
    }: { rows: ModalityPolicy[] } = await client.query(publishPolicySQL).catch(err => {
      throw err
    })
    return { ...published_policy }
  } catch (err) {
    logger.error(err)
    throw err
  }
}

export async function writePolicyMetadata(policy_metadata: PolicyMetadata) {
  const client = await getWriteableClient()
  const sql = `INSERT INTO ${schema.TABLE.policy_metadata} (${cols_sql(
    schema.TABLE_COLUMNS.policy_metadata
  )}) VALUES (${vals_sql(schema.TABLE_COLUMNS.policy_metadata)}) RETURNING *`
  const values = vals_list(schema.TABLE_COLUMNS.policy_metadata, {
    policy_id: policy_metadata.policy_id,
    policy_metadata: policy_metadata.policy_metadata
  })
  const {
    rows: [recorded_metadata]
  }: { rows: Recorded<PolicyMetadata>[] } = await client.query(sql, values)
  return {
    ...policy_metadata,
    ...recorded_metadata
  }
}

export async function updatePolicyMetadata(policy_metadata: PolicyMetadata) {
  try {
    await readSinglePolicyMetadata(policy_metadata.policy_id)
    const client = await getWriteableClient()
    const sql = `UPDATE ${schema.TABLE.policy_metadata}
      SET policy_metadata = '${JSON.stringify(policy_metadata.policy_metadata)}'
      WHERE policy_id = '${policy_metadata.policy_id}'`
    const {
      rows: [recorded_metadata]
    }: { rows: Recorded<PolicyMetadata>[] } = await client.query(sql)
    return {
      ...policy_metadata,
      ...recorded_metadata
    }
  } catch (err) {
    logger.error(err)
    throw err
  }
}

export async function readRule<PInfo extends PolicyTypeInfo>(rule_id: UUID): Promise<PInfo['Rule']> {
  const client = await getReadOnlyClient()
  const sql = `SELECT * from ${schema.TABLE.policies} where EXISTS(SELECT FROM json_array_elements(policy_json->'rules') elem WHERE (elem->'rule_id')::jsonb ? '${rule_id}');`
  const res = await client.query(sql).catch(err => {
    throw err
  })
  if (res.rowCount !== 1) {
    throw new Error(`invalid rule_id ${rule_id}`)
  } else {
    const [{ policy_json }]: { policy_json: PInfo['Policy'] }[] = res.rows
    const [rule] = policy_json.rules.filter(r => {
      return r.rule_id === rule_id
    })
    return rule
  }
}

export async function findPoliciesByGeographyID<PInfo extends PolicyTypeInfo>(
  geography_id: UUID
): Promise<PInfo['Policy'][]> {
  const client = await getReadOnlyClient()
  const sql = `select * from ${schema.TABLE.policies}
    where ${schema.COLUMN.policy_json}::jsonb
    @> '{"rules":[{"geographies":["${geography_id}"]}]}'`
  const res = await client.query(sql)
  return res.rows.map(row => row.policy_json)
}

export function filterUnsupersededPolicies<PInfo extends PolicyTypeInfo>(
  policies: PInfo['Policy'][]
): PInfo['Policy'][] {
  const prev_policies: UUID[] = policies.reduce((prev_policies_acc: UUID[], policy: PInfo['Policy']) => {
    if (policy.prev_policies) {
      prev_policies_acc.push(...policy.prev_policies)
    }
    return prev_policies_acc
  }, [])
  return policies.filter(policy => !prev_policies.includes(policy.policy_id))
}
