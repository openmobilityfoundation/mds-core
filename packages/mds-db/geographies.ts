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
import { Geography, GeographyMetadata, GeographySummary, Recorded, Timestamp, UUID } from '@mds-core/mds-types'
import {
  AlreadyPublishedError,
  BadParamsError,
  ConflictError,
  DependencyMissingError,
  NotFoundError
} from '@mds-core/mds-utils'
import { getReadOnlyClient, getWriteableClient } from './client'
import schema from './schema'
import { cols_sql, SqlVals, vals_list, vals_sql } from './sql-utils'
import { PublishGeographiesParams, ReadGeographiesParams } from './types'

export async function readSingleGeography(geography_id: UUID): Promise<Geography> {
  const client = await getReadOnlyClient()

  const sql = `select * from ${schema.TABLE.geographies} where geography_id = '${geography_id}'`
  const { rows } = await client.query(sql)

  if (rows.length === 0) {
    logger.info(`readSingleGeography failed for ${geography_id}`)
    throw new NotFoundError(`geography of id ${geography_id} not found`)
  }

  const { id, ...geography } = rows[0]
  return geography
}

export async function readGeographies(params: Partial<ReadGeographiesParams> = {}): Promise<Geography[]> {
  try {
    const client = await getReadOnlyClient()

    const { get_published, get_unpublished, geography_ids } = {
      get_published: false,
      get_unpublished: false,
      ...params
    }
    if (get_published && get_unpublished) {
      throw new BadParamsError('cannot have get_unpublished and get_published both be true')
    }

    let sql = `SELECT * FROM ${schema.TABLE.geographies}`

    const conditions = []
    const vals = new SqlVals()

    if (get_published) {
      conditions.push(`publish_date IS NOT NULL`)
    }

    if (get_unpublished) {
      conditions.push(`publish_date IS NULL`)
    }

    if (geography_ids) {
      const SQLified_geography_ids = geography_ids.map(id => {
        return `'${id}'`
      })
      conditions.push(`geography_id in (${SQLified_geography_ids.join(',')})`)
    }

    if (conditions.length) {
      sql += ` WHERE ${conditions.join(' AND ')}`
    }

    const values = vals.values()
    // TODO insufficiently general
    // TODO add 'count'
    const { rows } = await client.query(sql, values)

    return rows.map(row => {
      const { id, ...geography } = row
      return geography
    })
  } catch (err) {
    logger.error('readGeographies', err)
    throw err
  }
}

export async function readPublishedGeographies(only_published_after?: Timestamp): Promise<Geography[]> {
  try {
    const client = await getReadOnlyClient()

    let sql = `SELECT * FROM ${schema.TABLE.geographies}`

    let conditions = ''
    const vals = new SqlVals()

    if (only_published_after) {
      conditions = `publish_date > ${vals.add(only_published_after)}`
    } else {
      conditions = `publish_date IS NOT NULL`
    }

    sql += ` WHERE ${conditions}`

    const values = vals.values()
    const { rows } = await client.query(sql, values)

    return rows.map(row => {
      const { id, ...geography } = row
      return geography
    })
  } catch (err) {
    logger.error('readPublishedGeographies', err)
    throw err
  }
}

export async function readGeographySummaries(params?: ReadGeographiesParams): Promise<GeographySummary[]> {
  const geographies = await readGeographies(params)
  return geographies.map(geography => {
    const { geography_json, ...geographySummary } = geography
    return geographySummary
  })
}

export async function readBulkGeographyMetadata(params?: ReadGeographiesParams): Promise<GeographyMetadata[]> {
  const geographies = await readGeographies(params)
  const geography_ids = geographies.map(geography => `'${geography.geography_id}'`)

  if (geography_ids.length === 0) {
    return []
  }

  const sql = `select * from ${schema.TABLE.geography_metadata} where geography_id in (${geography_ids.join(',')})`

  const client = await getReadOnlyClient()
  const res = await client.query(sql)
  return res.rows.map(row => {
    return { geography_id: row.geography_id, geography_metadata: row.geography_metadata }
  })
}

export async function writeGeography(geography: Geography): Promise<Recorded<Geography>> {
  const client = await getWriteableClient()
  const sql = `INSERT INTO ${schema.TABLE.geographies} (${cols_sql(
    schema.TABLE_COLUMNS.geographies
  )}) VALUES (${vals_sql(schema.TABLE_COLUMNS.geographies)}) RETURNING *`
  const values = vals_list(schema.TABLE_COLUMNS.geographies, { ...geography })
  try {
    const {
      rows: [recorded_geography]
    }: { rows: Recorded<Geography>[] } = await client.query(sql, values)
    return { ...geography, ...recorded_geography }
  } catch (error) {
    if (error.code === '23505') {
      throw new ConflictError(`Geography with ID ${geography.geography_id} already exists!`)
    }
    throw error
  }
}

export async function isGeographyPublished(geography_id: UUID) {
  const client = await getReadOnlyClient()
  const sql = `SELECT * FROM ${schema.TABLE.geographies} WHERE geography_id='${geography_id}'`
  const result = await client.query(sql).catch(err => {
    throw err
  })
  if (result.rows.length === 0) {
    throw new NotFoundError(`geography_id ${geography_id} not found`)
  }
  return Boolean(result.rows[0].publish_date)
}

export async function editGeography(geography: Geography): Promise<Geography> {
  // validate TODO
  if (await isGeographyPublished(geography.geography_id)) {
    throw new Error('Cannot edit published Geography')
  }

  const client = await getWriteableClient()
  const vals = new SqlVals()
  const conditions: string[] = []
  Object.entries(geography).forEach(([key, value]) => {
    if (key === 'geography_json') {
      conditions.push(`geography_json = ${vals.add(JSON.stringify(geography.geography_json))}`)
    } else {
      conditions.push(`${key} = ${vals.add(value)}`)
    }
  })
  const sql = `UPDATE ${schema.TABLE.geographies} SET ${conditions} WHERE geography_id=${vals.add(
    geography.geography_id
  )} AND publish_date IS NULL`

  await client.query(sql, vals.values())
  return readSingleGeography(geography.geography_id)
}

export async function deleteGeography(geography_id: UUID) {
  await readSingleGeography(geography_id)
  if (await isGeographyPublished(geography_id)) {
    throw new AlreadyPublishedError('Cannot delete published Geography')
  }

  const client = await getWriteableClient()
  const sql = `DELETE FROM ${schema.TABLE.geographies} WHERE geography_id=$1 AND publish_date IS NULL`
  await client.query(sql, [geography_id])
  return geography_id
}

export async function publishGeography(params: PublishGeographiesParams): Promise<Geography> {
  /* publish_date is parameterized, because when a Policy is published,
   * we want to be able to set the publish_date of any associated Geography to be
   * identical to the publish_date of the Policy.
   */
  const { geography_id, publish_date = Date.now() } = params
  try {
    const client = await getWriteableClient()

    const geography = await readSingleGeography(geography_id)
    if (!geography) {
      throw new NotFoundError('cannot publish nonexistent geography')
    }

    const vals = new SqlVals()
    const conditions = []
    conditions.push(`publish_date = ${vals.add(publish_date)}`)
    const sql = `UPDATE ${schema.TABLE.geographies} SET ${conditions} where geography_id=${vals.add(
      geography_id
    )} RETURNING *`
    const {
      rows: [recorded_geography]
    }: { rows: Recorded<Geography>[] } = await client.query(sql, vals.values())
    return { ...recorded_geography }
  } catch (err) {
    logger.error(err)
    throw err
  }
}

export async function writeGeographyMetadata(geography_metadata: GeographyMetadata): Promise<GeographyMetadata> {
  try {
    await readSingleGeography(geography_metadata.geography_id)
    const client = await getWriteableClient()
    const sql = `INSERT INTO ${schema.TABLE.geography_metadata} (${cols_sql(
      schema.TABLE_COLUMNS.geography_metadata
    )}) VALUES (${vals_sql(schema.TABLE_COLUMNS.geography_metadata)}) RETURNING *`
    const values = vals_list(schema.TABLE_COLUMNS.geography_metadata, {
      geography_id: geography_metadata.geography_id,
      geography_metadata: geography_metadata.geography_metadata
    })
    const {
      rows: [recorded_metadata]
    }: { rows: Recorded<Geography>[] } = await client.query(sql, values)
    return { ...geography_metadata, ...recorded_metadata }
  } catch (err) {
    throw new DependencyMissingError(
      `metadata not written, because no geography exists for geography_id ${geography_metadata.geography_id}`
    )
  }
}

export async function readSingleGeographyMetadata(geography_id: UUID): Promise<GeographyMetadata> {
  const client = await getReadOnlyClient()
  const vals = new SqlVals()
  const sql = `SELECT * FROM ${schema.TABLE.geography_metadata} WHERE geography_id = ${vals.add(geography_id)}`
  const result = await client.query(sql, vals.values())
  if (result.rows.length === 0) {
    throw new NotFoundError(`Metadata for ${geography_id} not found`)
  }
  return { geography_id, geography_metadata: result.rows[0].geography_metadata }
}

export async function updateGeographyMetadata(geography_metadata: GeographyMetadata): Promise<GeographyMetadata> {
  await readSingleGeographyMetadata(geography_metadata.geography_id)
  const client = await getWriteableClient()
  const vals = new SqlVals()
  const sql = `UPDATE ${schema.TABLE.geography_metadata}
    SET geography_metadata = ${vals.add(JSON.stringify(geography_metadata.geography_metadata))}
    WHERE geography_id = ${vals.add(geography_metadata.geography_id)}`
  const {
    rows: [recorded_metadata]
  }: { rows: Recorded<GeographyMetadata>[] } = await client.query(sql, vals.values())
  return {
    ...geography_metadata,
    ...recorded_metadata
  }
}

export async function deleteGeographyMetadata(geography_id: UUID) {
  const client = await getWriteableClient()
  try {
    // Putting this DB call in because the SQL won't throw if the metadata isn't there.
    await readSingleGeographyMetadata(geography_id)
    const vals = new SqlVals()
    const sql = `DELETE FROM ${schema.TABLE.geography_metadata} WHERE geography_id = ${vals.add(geography_id)}`
    await client.query(sql, vals.values())
  } catch (err) {
    logger.error(`deleteGeographyMetadata called on non-existent metadata for ${geography_id}`, err.stack)
    throw err
  }
  return geography_id
}
