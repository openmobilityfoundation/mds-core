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

import { days, now, uuid } from '@mds-core/mds-utils'
import { GeographyServiceClient } from '../client'
import { GeographyRepository } from '../repository'
import { GeographyServiceManager } from '../service/manager'

const geography_id = uuid()

describe('Geography Repository Tests', () => {
  beforeAll(async () => {
    await GeographyRepository.initialize()
  })

  it('Run Migrations', async () => {
    await GeographyRepository.runAllMigrations()
  })

  it('Revert Migrations', async () => {
    await GeographyRepository.revertAllMigrations()
  })

  afterAll(async () => {
    await GeographyRepository.shutdown()
  })
})

const GeographyServer = GeographyServiceManager.controller()

describe('Geography Service Tests', () => {
  beforeAll(async () => {
    await GeographyServer.start()
  })

  it('Write Geographies', async () => {
    const geographies = await GeographyServiceClient.writeGeographies([
      {
        geography_id,
        publish_date: now(),
        geography_json: { type: 'FeatureCollection', features: [] }
      },
      { geography_id: uuid(), geography_json: { type: 'FeatureCollection', features: [] } }
    ])
    expect(geographies).toHaveLength(2)
  })

  it('Write Geographies Metadata', async () => {
    const metadata = await GeographyServiceClient.writeGeographiesMetadata([
      {
        geography_id,
        geography_metadata: { status: 'original' }
      }
    ])
    expect(metadata).toHaveLength(1)
  })

  it('Modify Geographies Metadata', async () => {
    const metadata = await GeographyServiceClient.writeGeographiesMetadata([
      {
        geography_id,
        geography_metadata: { status: 'modified' }
      }
    ])
    expect(metadata).toHaveLength(1)
  })

  it('Get All Geographies', async () => {
    const geographies = await GeographyServiceClient.getGeographies()
    expect(geographies).toHaveLength(2)
    geographies.forEach(geography => expect(geography.geography_metadata).toBeUndefined())
  })

  it('Get All Geographies With Metadata', async () => {
    const geographies = await GeographyServiceClient.getGeographies({ includeMetadata: true })
    expect(geographies).toHaveLength(2)
    geographies.forEach(geography => expect(geography.geography_metadata).not.toBeUndefined())
  })

  it('Get Unpublished Geographies', async () => {
    const geographies = await GeographyServiceClient.getUnpublishedGeographies()
    expect(geographies).toHaveLength(1)
    geographies.forEach(geography => expect(geography.geography_metadata).toBeUndefined())
  })

  it('Get Unpublished Geographies With Metadata', async () => {
    const [geography, ...others] = await GeographyServiceClient.getUnpublishedGeographies({ includeMetadata: true })
    expect(others).toHaveLength(0)
    expect(geography.geography_metadata).toBeNull()
  })

  it('Get Published Geographies', async () => {
    const geographies = await GeographyServiceClient.getPublishedGeographies()
    expect(geographies).toHaveLength(1)
    geographies.forEach(geography => expect(geography.geography_metadata).toBeUndefined())
  })

  it('Get Published Geographies With Metadata', async () => {
    const [geography, ...others] = await GeographyServiceClient.getPublishedGeographies({ includeMetadata: true })
    expect(others).toHaveLength(0)
    expect(geography.geography_metadata).toEqual({ status: 'modified' })
  })

  it('Get Geographies Published After Date', async () => {
    const geographies = await GeographyServiceClient.getPublishedGeographies({ publishedAfter: now() + days(1) })
    expect(geographies).toHaveLength(0)
  })

  it('Get Single Geography', async () => {
    const geography = await GeographyServiceClient.getGeography(geography_id)
    expect(geography).not.toBeUndefined()
    expect(geography?.geography_id).toEqual(geography_id)
    expect(geography?.geography_metadata).toBeUndefined()
  })

  it('Get Single Geography With Metadata', async () => {
    const geography = await GeographyServiceClient.getGeography(geography_id, { includeMetadata: true })
    expect(geography).not.toBeUndefined()
    expect(geography?.geography_id).toEqual(geography_id)
    expect(geography?.geography_metadata).toEqual({ status: 'modified' })
  })

  it('Get Single Geography (Not Found)', async () => {
    const geography = await GeographyServiceClient.getGeography(uuid())
    expect(geography).toBeUndefined()
  })

  it('Get Single Geography With Metadata (Not Found)', async () => {
    const geography = await GeographyServiceClient.getGeography(uuid(), { includeMetadata: true })
    expect(geography).toBeUndefined()
  })

  afterAll(async () => {
    await GeographyServer.stop()
  })
})
