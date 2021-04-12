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

import assert from 'assert'
/* eslint-reason extends object.prototype */
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import should from 'should'
import test from 'unit.js'

import { FeatureCollection } from 'geojson'
import { Telemetry, Recorded, Device, Geography, VehicleEvent } from '@mds-core/mds-types'
import {
  JUMP_TEST_DEVICE_1,
  JUMP_PROVIDER_ID,
  POLICY3_JSON,
  GEOGRAPHY_UUID,
  GEOGRAPHY2_UUID,
  START_ONE_MONTH_AGO,
  LA_CITY_BOUNDARY,
  DISTRICT_SEVEN,
  makeDevices,
  makeEventsWithTelemetry
} from '@mds-core/mds-test-data'
import { now, clone, rangeRandomInt, ConflictError, days, uuid } from '@mds-core/mds-utils'
import { isNullOrUndefined } from 'util'
import MDSDBPostgres from '../index'
import { initializeDB, shutdownDB, pg_info } from './helpers'

const startTime = now() - 200
const shapeUUID = 'e3ed0a0e-61d3-4887-8b6a-4af4f3769c14'
const LAGeography: Geography = {
  name: 'Los Angeles',
  geography_id: GEOGRAPHY_UUID,
  geography_json: LA_CITY_BOUNDARY
}
const DistrictSeven: Geography = {
  name: 'District Seven',
  geography_id: GEOGRAPHY2_UUID,
  geography_json: DISTRICT_SEVEN
}

/* You'll need postgres running and the env variable PG_NAME
 * to be set to run these tests.
 */
/* istanbul ignore next */

async function seedDB() {
  await MDSDBPostgres.reinitialize()
  const devices: Device[] = makeDevices(9, startTime, JUMP_PROVIDER_ID) as Device[]
  devices.push(JUMP_TEST_DEVICE_1 as Device)
  const decommissionEvents: VehicleEvent[] = makeEventsWithTelemetry(devices.slice(0, 9), startTime + 10, shapeUUID, {
    event_types: ['decommissioned'],
    vehicle_state: 'removed',
    speed: rangeRandomInt(0, 10)
  })
  const tripEndEvent: VehicleEvent[] = makeEventsWithTelemetry(devices.slice(9, 10), startTime + 10, shapeUUID, {
    event_types: ['trip_end'],
    vehicle_state: 'available',
    speed: rangeRandomInt(0, 10)
  })
  const telemetry: Telemetry[] = []
  const events: VehicleEvent[] = decommissionEvents.concat(tripEndEvent)
  events.map(event => {
    if (event.telemetry) {
      telemetry.push(event.telemetry)
    }
  })

  await MDSDBPostgres.seed({ devices, events, telemetry })
}

/**
 * @param reinit wipe the data first
 */
async function seedTripEvents(reinit = true) {
  reinit ? await MDSDBPostgres.reinitialize() : null

  const devices: Device[] = makeDevices(9, startTime, JUMP_PROVIDER_ID) as Device[]
  const trip_id = uuid()
  const tripStartEvents: VehicleEvent[] = makeEventsWithTelemetry(devices.slice(0, 9), startTime + 10, shapeUUID, {
    event_types: ['trip_start'],
    vehicle_state: 'on_trip',
    speed: rangeRandomInt(10),
    trip_id
  })
  const tripEndEvents: VehicleEvent[] = makeEventsWithTelemetry(devices.slice(9, 10), startTime + 10, shapeUUID, {
    event_types: ['trip_end'],
    vehicle_state: 'available',
    speed: rangeRandomInt(10),
    trip_id
  })
  const telemetry: Telemetry[] = []
  const events: VehicleEvent[] = tripStartEvents.concat(tripEndEvents)
  events.map(event => {
    if (event.telemetry) {
      telemetry.push(event.telemetry)
    }
  })

  await MDSDBPostgres.seed({ devices, events, telemetry })
}

if (pg_info.database) {
  describe('Test mds-db-postgres', () => {
    describe('test reads and writes', () => {
      beforeEach(async () => {
        await initializeDB()
      })

      afterEach(async () => {
        await shutdownDB()
      })

      // This is incredibly stupid and makes 0 sense, but if we don't import (and use) unit.js, should.js breaks...
      it('Nonsensical test', () => {
        // eslint-disable-next-line no-self-compare
        test.assert(true === true)
      })

      it('can make successful writes', async () => {
        await MDSDBPostgres.reinitialize()
        await MDSDBPostgres.writeDevice(JUMP_TEST_DEVICE_1)
        const device: Device = await MDSDBPostgres.readDevice(JUMP_TEST_DEVICE_1.device_id, JUMP_PROVIDER_ID)
        assert.deepEqual(device.device_id, JUMP_TEST_DEVICE_1.device_id)
      })

      it('can make a successful read query after shutting down a DB client', async () => {
        await shutdownDB()
        await MDSDBPostgres.writeDevice(JUMP_TEST_DEVICE_1)
        await shutdownDB()
        const device: Device = await MDSDBPostgres.readDevice(JUMP_TEST_DEVICE_1.device_id, JUMP_PROVIDER_ID)
        assert.deepEqual(device.device_id, JUMP_TEST_DEVICE_1.device_id)
      })

      it('can read and write Devices, VehicleEvents, and Telemetry', async () => {
        await seedDB()

        const devicesResult: Device[] = (await MDSDBPostgres.readDeviceIds(JUMP_PROVIDER_ID, 0, 20)) as Device[]
        assert.deepEqual(devicesResult.length, 10)
        const vehicleEventsResult = await MDSDBPostgres.readEvents({
          start_time: String(startTime)
        })
        assert.deepEqual(vehicleEventsResult.count, 10)

        const telemetryResults: Recorded<Telemetry>[] = await MDSDBPostgres.readTelemetry(
          devicesResult[0].device_id,
          startTime,
          now()
        )

        assert(telemetryResults.length > 0)
      })

      it('can read VehicleEvents and Telemetry as collections of trips', async () => {
        await seedTripEvents()
        await seedTripEvents(false)

        const devicesResult: Device[] = (await MDSDBPostgres.readDeviceIds(JUMP_PROVIDER_ID, 0, 18)) as Device[]
        assert.deepEqual(devicesResult.length, 18)

        const vehicleEventsResult = await MDSDBPostgres.readEvents({
          start_time: String(startTime)
        })
        const trip_ids = vehicleEventsResult.events.reduce((acc, event) => acc.add(event.trip_id), new Set())

        const tripEventsResult = await MDSDBPostgres.readTripEvents({
          start_time: String(startTime)
        })
        assert.deepStrictEqual(tripEventsResult.tripCount, trip_ids.size)

        // there should be X trips
        assert.deepStrictEqual(Object.keys(tripEventsResult.trips).length, trip_ids.size)

        // telemetry on each event should not be undefined
        Object.values(tripEventsResult.trips).forEach(trip => {
          trip.forEach(event => {
            assert.notStrictEqual(event.telemetry, undefined)
          })
        })
      })

      it('can wipe a device', async () => {
        await seedDB()
        const result = await MDSDBPostgres.wipeDevice(JUMP_PROVIDER_ID)
        assert(result !== undefined)
      })
    })

    describe('unit test read only functions', () => {
      beforeEach(async () => {
        await initializeDB()
        await seedDB()
      })

      afterEach(async () => {
        await shutdownDB()
      })

      it('can get vehicle counts by provider', async () => {
        const result = await MDSDBPostgres.getVehicleCountsPerProvider()
        assert.deepEqual(result[0].count, 10)
      })

      it('.getVehicleCountsPerProvider', async () => {
        const result = await MDSDBPostgres.getVehicleCountsPerProvider()
        assert.deepEqual(result[0].count, 10)
      })

      it('.health', async () => {
        const result = await MDSDBPostgres.health()
        assert(result.using === 'postgres')
        assert(!isNullOrUndefined(result.stats.current_running_queries))
      })
    })

    describe('unit test geography functions', () => {
      before(async () => {
        await initializeDB()
      })

      after(async () => {
        await shutdownDB()
      })

      it('can delete an unpublished Geography', async () => {
        await MDSDBPostgres.writeGeography(LAGeography)
        assert(!(await MDSDBPostgres.isGeographyPublished(LAGeography.geography_id)))
        await MDSDBPostgres.deleteGeography(LAGeography.geography_id)
        await MDSDBPostgres.readSingleGeography(LAGeography.geography_id).should.be.rejected()

        await MDSDBPostgres.writeGeography(LAGeography)
        await MDSDBPostgres.deleteGeography(LAGeography.geography_id)
        await MDSDBPostgres.readSingleGeography(LAGeography.geography_id).should.be.rejected()
      })

      it('can write, read, and publish a Geography', async () => {
        await MDSDBPostgres.writeGeography(LAGeography)
        const result = await MDSDBPostgres.readSingleGeography(LAGeography.geography_id)
        assert.deepEqual(result.geography_json, LAGeography.geography_json)
        assert.deepEqual(result.geography_id, LAGeography.geography_id)

        const noGeos = await MDSDBPostgres.readGeographies({ get_published: true })
        assert.deepEqual(noGeos.length, 0)

        await MDSDBPostgres.publishGeography({
          geography_id: LAGeography.geography_id,
          publish_date: now()
        })
        const writeableGeographies = await MDSDBPostgres.readGeographies({ get_published: false })
        assert.deepEqual(writeableGeographies.length, 1)
      })

      it('can read published geographies, filter by date published', async () => {
        const allPublishedGeographies = await MDSDBPostgres.readPublishedGeographies()
        assert.deepEqual(allPublishedGeographies.length, 1)

        const publishTimePastGeographies = await MDSDBPostgres.readPublishedGeographies(START_ONE_MONTH_AGO)
        assert.deepEqual(publishTimePastGeographies.length, 1)

        const ONE_MONTH_FROM_NOW = now() + days(30)
        const publishTimeFutureGeographies = await MDSDBPostgres.readPublishedGeographies(ONE_MONTH_FROM_NOW)

        assert.deepEqual(publishTimeFutureGeographies.length, 0)
      })

      it('does not write a geography if one with the same id already exists', async () => {
        await MDSDBPostgres.writeGeography(LAGeography).should.be.rejectedWith(ConflictError)
      })

      it('can tell a Geography is published', async () => {
        await MDSDBPostgres.writeGeography(DistrictSeven)
        const publishedResult = await MDSDBPostgres.isGeographyPublished(LAGeography.geography_id)
        assert.deepEqual(publishedResult, true)
        const unpublishedResult = await MDSDBPostgres.isGeographyPublished(DistrictSeven.geography_id)
        assert.deepEqual(unpublishedResult, false)
      })

      it('.readGeographies understands all its parameters', async () => {
        const publishedResult = await MDSDBPostgres.readGeographies({ get_published: true })
        assert.deepEqual(publishedResult.length, 1)
        assert.deepEqual(!!publishedResult[0].publish_date, true)
        const unpublishedResult = await MDSDBPostgres.readGeographies({ get_unpublished: true })
        assert.deepEqual(unpublishedResult.length, 1)
        assert.deepEqual(!!unpublishedResult[0].publish_date, false)
        const withIDsResult = await MDSDBPostgres.readGeographies({ geography_ids: [LAGeography.geography_id] })
        assert.deepEqual(withIDsResult.length, 1)
        assert.deepEqual(withIDsResult[0].geography_id, LAGeography.geography_id)
      })

      it('can edit a Geography', async () => {
        const geography_json = clone(DistrictSeven.geography_json)
        const numFeatures = geography_json.features.length
        geography_json.features = []
        await MDSDBPostgres.editGeography({
          name: 'District Seven Updated Name',
          geography_id: DistrictSeven.geography_id,
          geography_json
        })
        const result = await MDSDBPostgres.readSingleGeography(GEOGRAPHY2_UUID)
        assert.notEqual(result.geography_json.features.length, numFeatures)
        assert.equal(result.name, 'District Seven Updated Name')
        assert.equal(result.geography_json.features.length, 0)
      })

      it('will not edit or delete a published Geography', async () => {
        const publishedGeographyJSON = clone(LAGeography.geography_json) as FeatureCollection
        publishedGeographyJSON.features = []
        await MDSDBPostgres.editGeography({
          name: 'Los Angeles',
          geography_id: LAGeography.geography_id,
          geography_json: publishedGeographyJSON
        }).should.be.rejected()
        await MDSDBPostgres.deleteGeography(LAGeography.geography_id).should.be.rejected()
      })

      it('understands the summary parameter', async () => {
        const geographiesWithoutGeoJSON = await MDSDBPostgres.readGeographies()
        geographiesWithoutGeoJSON.forEach(geography => assert(geography.geography_json))
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const geographiesWithGeoJSON = (await MDSDBPostgres.readGeographySummaries()) as any[]
        geographiesWithGeoJSON.forEach(geography => assert.deepEqual(!!geography.geography_json, false))
      })
    })

    describe('test Geography Policy interaction', () => {
      before(async () => {
        await initializeDB()
      })

      after(async () => {
        await shutdownDB()
      })

      it('will throw an error if an attempt is made to publish a Policy but the Geography is unpublished', async () => {
        await MDSDBPostgres.writeGeography(LAGeography)
        await MDSDBPostgres.writeGeography(DistrictSeven)
        assert(!(await MDSDBPostgres.isGeographyPublished(DistrictSeven.geography_id)))
        assert(!(await MDSDBPostgres.isGeographyPublished(LAGeography.geography_id)))
        await MDSDBPostgres.writePolicy(POLICY3_JSON)

        await assert.rejects(
          async () => {
            await MDSDBPostgres.publishPolicy(POLICY3_JSON.policy_id)
          },
          { name: 'DependencyMissingError' }
        )
      })

      it('can find policies using geographies by geography ID', async () => {
        const policies = await MDSDBPostgres.findPoliciesByGeographyID(LAGeography.geography_id)
        assert.deepEqual(policies[0].policy_id, POLICY3_JSON.policy_id)
      })

      it('throws if both get_published and get_unpublished are true for bulk geo reads', async () => {
        await assert.rejects(
          async () => {
            await MDSDBPostgres.readGeographies({ get_published: true, get_unpublished: true })
          },
          { name: 'BadParamsError' }
        )
      })
    })

    describe('Geography metadata', () => {
      before(async () => {
        await initializeDB()
      })

      after(async () => {
        await shutdownDB()
      })

      it('should write a GeographyMetadata only if there is a Geography in the DB', async () => {
        const geographyMetadata = {
          geography_id: GEOGRAPHY_UUID,
          geography_metadata: { foo: 'afoo' }
        }
        await assert.rejects(
          async () => {
            await MDSDBPostgres.writeGeographyMetadata(geographyMetadata)
          },
          { name: 'DependencyMissingError' }
        )
        await MDSDBPostgres.writeGeography(LAGeography)
        await MDSDBPostgres.writeGeographyMetadata(geographyMetadata)
        const geographyMetadataResult = await MDSDBPostgres.readSingleGeographyMetadata(GEOGRAPHY_UUID)
        assert.deepEqual(geographyMetadataResult, geographyMetadata)
      })

      it('can do bulk GeographyMetadata reads', async () => {
        const all = await MDSDBPostgres.readBulkGeographyMetadata()
        assert.deepEqual(all.length, 1)
        const readOnlyResult = await MDSDBPostgres.readBulkGeographyMetadata({
          get_published: true,
          get_unpublished: false
        })
        assert.deepEqual(readOnlyResult.length, 0)
        const notReadOnlyResult = await MDSDBPostgres.readBulkGeographyMetadata({
          get_published: null,
          get_unpublished: null
        })
        assert.deepEqual(notReadOnlyResult.length, 1)
      })

      it('updates GeographyMetadata', async () => {
        const geographyMetadata = {
          geography_id: GEOGRAPHY_UUID,
          geography_metadata: { foo: 'notafoo' }
        }
        const res = await MDSDBPostgres.updateGeographyMetadata(geographyMetadata)
        assert.deepEqual(res.geography_metadata.foo, 'notafoo')
      })

      it('deletes GeographyMetadata', async () => {
        await MDSDBPostgres.deleteGeographyMetadata(GEOGRAPHY_UUID)
        await assert.rejects(
          async () => {
            await MDSDBPostgres.readSingleGeographyMetadata(GEOGRAPHY_UUID)
          },
          { name: 'NotFoundError' }
        )
      })
    })
  })
}
