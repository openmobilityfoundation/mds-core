import db from '@mds-core/mds-db'
import cache from '@mds-core/mds-cache'
import { now } from '@mds-core/mds-utils'
import { VEHICLE_EVENTS, VEHICLE_EVENT, VEHICLE_TYPES } from '@mds-core/mds-types'
import uuid from 'uuid'
import assert from 'assert'
import metric from '../src/metrics'
import config from '../src/config'

const PROVIDER_ID = config.organization.providers[0]
const time = now()
async function seedDeviceState(event: VEHICLE_EVENT) {
  await db.insertDeviceStates({
    vehicle_type: VEHICLE_TYPES.scooter,
    type: 'event',
    timestamp: time,
    device_id: uuid(),
    provider_id: PROVIDER_ID,
    recorded: now(),
    annotation_version: 1,
    annotation: null,
    gps: null,
    service_area_id: null,
    charge: null,
    state: null,
    event_type: event,
    event_type_reason: null,
    trip_id: uuid()
  })
}
async function seedDeviceStates() {
  await Promise.all(
    Object.keys(VEHICLE_EVENTS).map(async event => {
      await seedDeviceState(event as VEHICLE_EVENT)
    })
  )
  await seedDeviceState(VEHICLE_EVENTS.register)
  await seedDeviceState(VEHICLE_EVENTS.register)
}

describe('Proc Metrics', () => {
  before(async () => {
    await db.initialize()
    await cache.initialize()
    await seedDeviceStates()
  })

  after(async () => {
    await db.shutdown()
    await cache.shutdown()
  })

  it('calcEventCounts', async () => {
    const res = await metric.calcEventCounts(PROVIDER_ID, VEHICLE_TYPES.scooter, time - 10000, time + 10000)
    assert.deepStrictEqual(res, {
      service_start: 1,
      provider_drop_off: 1,
      trip_end: 1,
      cancel_reservation: 1,
      reserve: 1,
      service_end: 1,
      trip_start: 1,
      trip_enter: 1,
      trip_leave: 1,
      register: 3,
      provider_pick_up: 1,
      agency_drop_off: 1,
      deregister: 1,
      agency_pick_up: 1,
      telemetry: 0
    })
  })

  it('calcVehicleCounts', async () => {
    const res = await metric.calcVehicleCounts(PROVIDER_ID, VEHICLE_TYPES.scooter, time - 10000, time + 10000)
    assert.deepStrictEqual(res, { registered: 2, deployed: null, dead: null })
  })

  it('calcTripCount', async () => {
    const res = await metric.calcTripCount(PROVIDER_ID, VEHICLE_TYPES.scooter, time - 10000, time + 10000)
    assert.deepStrictEqual(res, 16)
  })
})
