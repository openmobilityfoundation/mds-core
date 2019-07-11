import assert from 'assert'
import { Telemetry, Recorded, VehicleEvent, Device } from 'mds'
import {
  JUMP_TEST_DEVICE_1,
  makeDevices,
  makeEventsWithTelemetry,
  makeEvents,
  makeStatusChange,
  makeTrip,
  JUMP_PROVIDER_ID,
  POLICY_JSON,
  POLICY2_JSON
} from 'mds-test-data'
import logger from 'mds-logger'
import { now, clone } from 'mds-utils'

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
    'deregister'
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
        const device: Device = await MDSDBPostgres.readDevice(JUMP_TEST_DEVICE_1.device_id)
        assert.deepEqual(device.device_id, JUMP_TEST_DEVICE_1.device_id)
      })

      it('can make a successful read query after shutting down a DB client', async () => {
        await MDSDBPostgres.initialize()
        await MDSDBPostgres.shutdown()

        await MDSDBPostgres.writeDevice(JUMP_TEST_DEVICE_1)
        await MDSDBPostgres.shutdown()
        const device: Device = await MDSDBPostgres.readDevice(JUMP_TEST_DEVICE_1.device_id)
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
        assert.deepEqual(result[0].event_type, 'deregister')
        assert.deepEqual(result[0].count, 9)
        assert.deepEqual(result[1].provider_id, JUMP_PROVIDER_ID)
        assert.deepEqual(result[1].event_type, 'trip_end')
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
        const client: MDSPostgresClient = configureClient(pg_info)
        await client.connect()
        await dropTables(client)
        await createTables(client)
        await updateSchema(client)
        await client.end()
      })

      after(async () => {
        await MDSDBPostgres.shutdown()
      })

      it('can write, read, and publish a Policy', async () => {
        await MDSDBPostgres.initialize()
        await MDSDBPostgres.writePolicy(POLICY_JSON)
        const result = await MDSDBPostgres.readPolicies({ policy_id: POLICY_JSON.policy_id })
        assert.deepEqual(result[0], POLICY_JSON)

        await MDSDBPostgres.writePolicy(POLICY2_JSON)
        await MDSDBPostgres.publishPolicy(POLICY_JSON.policy_id)
        const allPolicies = await MDSDBPostgres.readPolicies()
        assert.deepEqual(allPolicies.length, 2)
        const unpublishedPolicies = await MDSDBPostgres.readPolicies({ get_unpublished: true })
        assert.deepEqual(unpublishedPolicies.length, 1)
      })

      it('can edit a Policy', async () => {
        const policy = clone(POLICY2_JSON)
        policy.name = 'a shiny new name'
        await MDSDBPostgres.editPolicy(policy)
        const result = await MDSDBPostgres.readPolicies({ policy_id: POLICY2_JSON.policy_id })
        assert.deepEqual(result[0].name, 'a shiny new name')
      })

      it('will not edit a published Policy', async () => {
        const publishedPolicy = clone(POLICY_JSON)
        publishedPolicy.name = 'a shiny new name'
        await MDSDBPostgres.editPolicy(publishedPolicy)
        const result = await MDSDBPostgres.readPolicies({ policy_id: POLICY_JSON.policy_id })
        assert.notDeepEqual(result[0].name, 'a shiny new name')
      })
    })
  })
}
