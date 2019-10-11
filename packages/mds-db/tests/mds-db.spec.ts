import assert from 'assert'
/* eslint-reason extends object.prototype */
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import should from 'should'
import { FeatureCollection } from 'geojson'
import { Telemetry, Recorded, VehicleEvent, Device, VEHICLE_EVENTS, Geography } from '@mds-core/mds-types'
import {
  JUMP_TEST_DEVICE_1,
  makeDevices,
  makeEventsWithTelemetry,
  makeEvents,
  makeStatusChange,
  makeTrip,
  JUMP_PROVIDER_ID,
  POLICY_JSON,
  POLICY2_JSON,
  POLICY3_JSON,
  GEOGRAPHY_UUID,
  GEOGRAPHY2_UUID,
  LA_CITY_BOUNDARY,
  DISTRICT_SEVEN
} from '@mds-core/mds-test-data'
import { now, clone, NotFoundError } from '@mds-core/mds-utils'

import { isNullOrUndefined } from 'util'
import MDSDBPostgres from '../index'

import { dropTables, createTables, updateSchema } from '../migration'
import { Trip, StatusChange, ReadStatusChangesResult } from '../types'
import { configureClient, MDSPostgresClient, PGInfo } from '../sql-utils'

const { env } = process

const pg_info: PGInfo = {
  database: env.PG_NAME,
  host: env.PG_HOST || 'localhost',
  user: env.PG_USER,
  password: env.PG_PASS,
  port: Number(env.PG_PORT) || 5432
}

const startTime = now() - 200
const shapeUUID = 'e3ed0a0e-61d3-4887-8b6a-4af4f3769c14'
const LAGeography: Geography = {
  name: 'Los Angeles',
  geography_id: GEOGRAPHY_UUID,
  geography_json: LA_CITY_BOUNDARY,
  read_only: false
}
const DistrictSeven: Geography = {
  name: 'District Seven',
  geography_id: GEOGRAPHY2_UUID,
  geography_json: DISTRICT_SEVEN,
  read_only: false
}

/* You'll need postgres running and the env variable PG_NAME
 * to be set to run these tests.
 */
/* istanbul ignore next */

async function seedDB() {
  await MDSDBPostgres.initialize()
  const devices: Device[] = makeDevices(9, startTime, JUMP_PROVIDER_ID) as Device[]
  devices.push(JUMP_TEST_DEVICE_1 as Device)
  const deregisterEvents: VehicleEvent[] = makeEventsWithTelemetry(
    devices.slice(0, 9),
    startTime + 10,
    shapeUUID,
    VEHICLE_EVENTS.deregister
  )
  const tripEndEvent: VehicleEvent[] = makeEventsWithTelemetry(
    devices.slice(9, 10),
    startTime + 10,
    shapeUUID,
    'trip_end'
  )
  const telemetry: Telemetry[] = []
  const events: VehicleEvent[] = deregisterEvents.concat(tripEndEvent)
  events.map(event => {
    if (event.telemetry) {
      telemetry.push(event.telemetry)
    }
  })

  await MDSDBPostgres.seed({ devices, events, telemetry })
}

async function setFreshDB() {
  const client: MDSPostgresClient = configureClient(pg_info)
  await client.connect()
  await dropTables(client)
  await createTables(client)
  await updateSchema(client)
  await client.end()
}

if (pg_info.database) {
  describe('Test mds-db-postgres', () => {
    describe('test reads and writes', () => {
      beforeEach(async () => {
        const client: MDSPostgresClient = configureClient(pg_info)
        await client.connect()
        await dropTables(client)
        await createTables(client)
        await updateSchema(client)
        await client.end()
      })

      afterEach(async () => {
        await MDSDBPostgres.shutdown()
      })

      it('can make successful writes', async () => {
        await MDSDBPostgres.initialize()
        await MDSDBPostgres.writeDevice(JUMP_TEST_DEVICE_1)
        const device: Device = await MDSDBPostgres.readDevice(JUMP_TEST_DEVICE_1.device_id, JUMP_PROVIDER_ID)
        assert.deepEqual(device.device_id, JUMP_TEST_DEVICE_1.device_id)
      })

      it('can make a successful read query after shutting down a DB client', async () => {
        await MDSDBPostgres.initialize()
        await MDSDBPostgres.shutdown()

        await MDSDBPostgres.writeDevice(JUMP_TEST_DEVICE_1)
        await MDSDBPostgres.shutdown()
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

      it('can wipe a device', async () => {
        await seedDB()
        const result = await MDSDBPostgres.wipeDevice(JUMP_PROVIDER_ID)
        assert(result !== undefined)
      })

      it('can read and write StatusChanges', async () => {
        await MDSDBPostgres.initialize()
        const devices: Device[] = [JUMP_TEST_DEVICE_1]
        const events: VehicleEvent[] = makeEventsWithTelemetry(devices, startTime + 10, shapeUUID)
        await MDSDBPostgres.seed({ devices, events })

        const change: StatusChange = makeStatusChange(JUMP_TEST_DEVICE_1, startTime + 10)
        await MDSDBPostgres.writeStatusChanges([change])
        const result: ReadStatusChangesResult = await MDSDBPostgres.readStatusChanges({
          skip: 0,
          take: 1
        })
        assert.deepEqual(result.status_changes[0].device_id, JUMP_TEST_DEVICE_1.device_id)
      })
    })

    describe('unit test read only functions', () => {
      beforeEach(async () => {
        const client: MDSPostgresClient = configureClient(pg_info)
        await client.connect()
        await dropTables(client)
        await createTables(client)
        await updateSchema(client)
        await client.end()
        await seedDB()
      })

      afterEach(async () => {
        await MDSDBPostgres.shutdown()
      })

      it('can get vehicle counts by provider', async () => {
        const result = await MDSDBPostgres.getVehicleCountsPerProvider()
        assert.deepEqual(result[0].count, 10)
      })

      it('.getEventCountsPerProviderSince', async () => {
        const result = await MDSDBPostgres.getEventCountsPerProviderSince()
        assert.deepEqual(result[0].provider_id, JUMP_PROVIDER_ID)
        assert.deepEqual(result[0].event_type, VEHICLE_EVENTS.deregister)
        assert.deepEqual(result[0].count, 9)
        assert.deepEqual(result[1].provider_id, JUMP_PROVIDER_ID)
        assert.deepEqual(result[1].event_type, VEHICLE_EVENTS.trip_end)
        assert.deepEqual(result[1].count, 1)
      })

      it('.getEventsLast24HoursPerProvider', async () => {
        const result = await MDSDBPostgres.getEventsLast24HoursPerProvider()
        assert.deepEqual(result.length, 10)
        const firstResult = result[0]
        assert(firstResult.provider_id)
        assert(firstResult.device_id)
        assert(firstResult.event_type)
        assert(firstResult.recorded)
        assert(firstResult.timestamp)
      })

      it('.getTelemetryCountsPerProviderSince', async () => {
        const result = await MDSDBPostgres.getTelemetryCountsPerProviderSince()
        assert.deepEqual(result.length, 1)
      })

      it('.getTripCountsPerProviderSince', async () => {
        const result = await MDSDBPostgres.getTripCountsPerProviderSince()
        assert.deepEqual(result[0].count, 1)
      })

      it('.getVehicleCountsPerProvider', async () => {
        const result = await MDSDBPostgres.getVehicleCountsPerProvider()
        assert.deepEqual(result[0].count, 10)
      })

      it('.getNumVehiclesRegisteredLast24HoursByProvider', async () => {
        const result = await MDSDBPostgres.getNumVehiclesRegisteredLast24HoursByProvider()
        assert.deepEqual(result[0].count, 10)
      })

      it('.getNumEventsLast24HoursByProvider', async () => {
        const result = await MDSDBPostgres.getNumEventsLast24HoursByProvider()
        assert.deepEqual(result[0].count, 10)
      })

      it('.getTripEventsLast24HoursByProvider', async () => {
        const trip1: Trip = makeTrip(JUMP_TEST_DEVICE_1)
        const trip2: Trip = makeTrip(JUMP_TEST_DEVICE_1)
        await MDSDBPostgres.writeTrips([trip1, trip2])
        const event1: VehicleEvent = makeEvents([JUMP_TEST_DEVICE_1], now() - 5)[0]
        const event2: VehicleEvent = makeEvents([JUMP_TEST_DEVICE_1], now())[0]
        event1.trip_id = trip1.provider_trip_id
        event2.trip_id = trip2.provider_trip_id
        await MDSDBPostgres.writeEvent(event1)
        await MDSDBPostgres.writeEvent(event2)
        const result = await MDSDBPostgres.getTripEventsLast24HoursByProvider()
        assert.deepEqual(result.length, 2)
      })

      it('.getMostRecentEventByProvider', async () => {
        const result = await MDSDBPostgres.getMostRecentEventByProvider()
        assert.deepEqual(result.length, 1)
      })

      it('.health', async () => {
        const result = await MDSDBPostgres.health()
        assert(result.using === 'postgres')
        assert(!isNullOrUndefined(result.stats.current_running_queries))
      })
    })

    describe('unit test policy functions', () => {
      before(async () => {
        await setFreshDB()
      })

      after(async () => {
        await MDSDBPostgres.shutdown()
      })

      it('can delete an unpublished Policy', async () => {
        const { policy_id } = POLICY_JSON
        await MDSDBPostgres.writePolicy(POLICY_JSON)
        assert(!(await MDSDBPostgres.isPolicyPublished(policy_id)))
        await MDSDBPostgres.deletePolicy(policy_id)
        const policy_result = await MDSDBPostgres.readPolicies({ policy_id })
        assert.deepEqual(policy_result, [])
      })

      it('can write, read, and publish a Policy', async () => {
        await MDSDBPostgres.initialize()
        await MDSDBPostgres.writePolicy(POLICY_JSON)
        await MDSDBPostgres.writePolicy(POLICY2_JSON)
        await MDSDBPostgres.writePolicy(POLICY3_JSON)

        await MDSDBPostgres.writeGeography(LAGeography)
        await MDSDBPostgres.publishPolicy(POLICY_JSON.policy_id)

        // Read all policies, no matter whether published or not.
        const policies = await MDSDBPostgres.readPolicies()
        assert.deepEqual(policies.length, 3)
        const unpublishedPolicies = await MDSDBPostgres.readPolicies({ get_unpublished: true })
        assert.deepEqual(unpublishedPolicies.length, 2)
        const publishedPolicies = await MDSDBPostgres.readPolicies({ get_published: true })
        assert.deepEqual(publishedPolicies.length, 1)
      })

      it('can read a single Policy', async () => {
        const policy = await MDSDBPostgres.readPolicy(POLICY_JSON.policy_id)
        assert.deepEqual(policy.policy_id, POLICY_JSON.policy_id)
        assert.deepEqual(policy.name, POLICY_JSON.name)
      })

      it('cannot find a nonexistent Policy', async () => {
        await MDSDBPostgres.readPolicy('incrediblefailure').should.be.rejected()
      })

      it('can tell a Policy is published', async () => {
        const publishedResult = await MDSDBPostgres.isPolicyPublished(POLICY_JSON.policy_id)
        assert.deepEqual(publishedResult, true)
        const unpublishedResult = await MDSDBPostgres.isPolicyPublished(POLICY2_JSON.policy_id)
        assert.deepEqual(unpublishedResult, false)
      })

      it('can edit a Policy', async () => {
        const policy = clone(POLICY2_JSON)
        policy.name = 'a shiny new name'
        await MDSDBPostgres.editPolicy(policy)
        const result = await MDSDBPostgres.readPolicies({ policy_id: POLICY2_JSON.policy_id, get_unpublished: true })
        assert.deepEqual(result[0].name, 'a shiny new name')
      })

      it('will not edit or delete a published Policy', async () => {
        const publishedPolicy = clone(POLICY_JSON)
        publishedPolicy.name = 'a shiny new name'
        await MDSDBPostgres.editPolicy(publishedPolicy).should.be.rejected()
        await MDSDBPostgres.deletePolicy(publishedPolicy.policy_id).should.be.rejected()
      })

      it('will throw an error if attempting to edit a nonexistent Policy', async () => {
        const policy = clone(POLICY2_JSON)
        policy.policy_id = '28218022-d333-41be-bda5-1dc4288516d2'
        await MDSDBPostgres.editPolicy(policy).should.be.rejectedWith(NotFoundError)
      })
    })

    describe('unit test PolicyMetadata functions', () => {
      before(async () => {
        await setFreshDB()
      })

      after(async () => {
        await MDSDBPostgres.shutdown()
      })

      it('.readBulkPolicyMetadata', async () => {
        await MDSDBPostgres.writePolicy(POLICY_JSON)
        await MDSDBPostgres.writePolicy(POLICY2_JSON)
        await MDSDBPostgres.writePolicy(POLICY3_JSON)

        await MDSDBPostgres.writePolicyMetadata({
          policy_id: POLICY_JSON.policy_id,
          policy_metadata: { name: 'policy_json' }
        })
        await MDSDBPostgres.writePolicyMetadata({
          policy_id: POLICY2_JSON.policy_id,
          policy_metadata: { name: 'policy2_json' }
        })
        await MDSDBPostgres.writePolicyMetadata({
          policy_id: POLICY3_JSON.policy_id,
          policy_metadata: { name: 'policy3_json' }
        })

        const noParamsResult = await MDSDBPostgres.readBulkPolicyMetadata()
        assert.deepEqual(noParamsResult.length, 3)
        const withStartDateResult = await MDSDBPostgres.readBulkPolicyMetadata({ start_date: now() })
        assert.deepEqual(withStartDateResult.length, 1)
        assert.deepEqual(withStartDateResult[0].policy_metadata.name, 'policy3_json')
      })
    })

    describe('unit test geography functions', () => {
      before(async () => {
        await setFreshDB()
      })

      after(async () => {
        await MDSDBPostgres.shutdown()
      })

      it('can delete an unpublished Geography', async () => {
        await MDSDBPostgres.writeGeography(LAGeography)
        assert(!(await MDSDBPostgres.isGeographyPublished(LAGeography.geography_id)))
        await MDSDBPostgres.deleteGeography(LAGeography.geography_id)
        await MDSDBPostgres.readSingleGeography(LAGeography.geography_id).should.be.rejected()
      })

      it('can write, read, and publish a Geography', async () => {
        await MDSDBPostgres.initialize()
        await MDSDBPostgres.writeGeography(LAGeography)
        const result = await MDSDBPostgres.readSingleGeography(LAGeography.geography_id)
        assert.deepEqual(result.geography_json, LAGeography.geography_json)
        assert.deepEqual(result.geography_id, LAGeography.geography_id)

        const noGeos = await MDSDBPostgres.readGeographies({ get_read_only: true })
        assert.deepEqual(noGeos.length, 0)

        await MDSDBPostgres.publishGeography(LAGeography.geography_id)
        const writeableGeographies = await MDSDBPostgres.readGeographies({ get_read_only: false })
        assert.deepEqual(writeableGeographies.length, 1)
      })

      it('can tell a Geography is published', async () => {
        await MDSDBPostgres.writeGeography(DistrictSeven)
        const publishedResult = await MDSDBPostgres.isGeographyPublished(LAGeography.geography_id)
        assert.deepEqual(publishedResult, true)
        const unpublishedResult = await MDSDBPostgres.isGeographyPublished(DistrictSeven.geography_id)
        assert.deepEqual(unpublishedResult, false)
      })

      it('can edit a Geography', async () => {
        const geography_json = clone(DistrictSeven.geography_json)
        const numFeatures = geography_json.features.length
        geography_json.features = []
        await MDSDBPostgres.editGeography({
          name: 'District Seven',
          geography_id: DistrictSeven.geography_id,
          geography_json
        })
        const result = await MDSDBPostgres.readSingleGeography(GEOGRAPHY2_UUID)
        assert.notEqual(result.geography_json.features.length, numFeatures)
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
        const geographiesWithoutGeoJSON = await MDSDBPostgres.readGeographies({ summary: false })
        geographiesWithoutGeoJSON.forEach(geography => assert(geography.geography_json))
        const geographiesWithGeoJSON = await MDSDBPostgres.readGeographies({ summary: true })
        geographiesWithGeoJSON.forEach(geography => assert.deepEqual(!!geography.geography_json, false))
      })
    })

    describe('test Geography Policy interaction', () => {
      before(async () => {
        await setFreshDB()
      })

      after(async () => {
        await MDSDBPostgres.shutdown()
      })

      it('will publish a Geography if a Policy is published', async () => {
        await MDSDBPostgres.writeGeography(LAGeography)
        await MDSDBPostgres.writeGeography(DistrictSeven)
        assert(!(await MDSDBPostgres.isGeographyPublished(DistrictSeven.geography_id)))
        assert(!(await MDSDBPostgres.isGeographyPublished(LAGeography.geography_id)))

        await MDSDBPostgres.writePolicy(POLICY3_JSON)
        await MDSDBPostgres.publishPolicy(POLICY3_JSON.policy_id)
        assert(await MDSDBPostgres.isGeographyPublished(DistrictSeven.geography_id))
        assert(await MDSDBPostgres.isGeographyPublished(LAGeography.geography_id))
      })
    })

    describe('Geography metadata', () => {
      before(async () => {
        await setFreshDB()
      })

      after(async () => {
        await MDSDBPostgres.shutdown()
      })

      it('should write a GeographyMetadata only if there is a Geography in the DB', async () => {
        const geographyMetadata = {
          geography_id: GEOGRAPHY_UUID,
          geography_metadata: { foo: 'afoo' }
        }
        try {
          await MDSDBPostgres.writeGeographyMetadata(geographyMetadata)
          throw new Error('Should have thrown')
        } catch (err) {
          await MDSDBPostgres.writeGeography(LAGeography)
          await MDSDBPostgres.writeGeographyMetadata(geographyMetadata)
          const geographyMetadataResult = await MDSDBPostgres.readSingleGeographyMetadata(GEOGRAPHY_UUID)
          assert.deepEqual(geographyMetadataResult, geographyMetadata)
        }
      })

      it('can do bulk GeographyMetadata reads', async () => {
        const all = await MDSDBPostgres.readBulkGeographyMetadata()
        assert.deepEqual(all.length, 1)
        const readOnlyResult = await MDSDBPostgres.readBulkGeographyMetadata({ get_read_only: true })
        assert.deepEqual(readOnlyResult.length, 0)
        const notReadOnlyResult = await MDSDBPostgres.readBulkGeographyMetadata({ get_read_only: false })
        assert.deepEqual(notReadOnlyResult.length, 1)
      })
    })
  })
}
