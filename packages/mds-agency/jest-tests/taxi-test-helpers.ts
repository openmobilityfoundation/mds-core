import { Device, TripMetadata, UUID, VehicleEvent } from '@mds-core/mds-types'
import { TEST1_PROVIDER_ID } from '@mds-core/mds-providers'
import { now, uuid } from '@mds-core/mds-utils'
import type supertest from 'supertest'
// eslint-disable-next-line import/no-extraneous-dependencies
import { PROVIDER_SCOPES } from '@mds-core/mds-test-data'

export type POSTableVehicleEvent = Omit<VehicleEvent, 'provider_id' | 'recorded'>

const AUTH =
  process.env.AUTH_TOKEN ?? `basic ${Buffer.from(`${TEST1_PROVIDER_ID}|${PROVIDER_SCOPES}`).toString('base64')}`

const TEST_TAXI: () => Omit<Device, 'recorded'> = () => ({
  accessibility_options: ['wheelchair_accessible'],
  device_id: uuid(),
  provider_id: TEST1_PROVIDER_ID,
  vehicle_id: 'test-id-1',
  vehicle_type: 'car',
  propulsion_types: ['electric'],
  year: 2018,
  mfgr: 'Schwinn',
  modality: 'taxi',
  model: 'Mantaray'
})

const TEST_TELEMETRY = ({ device_id }: Pick<Device, 'device_id'>) => ({
  device_id,
  provider_id: TEST1_PROVIDER_ID,
  gps: {
    lat: 37.3382,
    lng: -121.8863,
    speed: 0,
    hdop: 1,
    heading: 180
  },
  charge: 0.5,
  timestamp: now()
})

export const fakeVehicle = (overrides?: Partial<Device>) => ({ ...TEST_TAXI(), ...overrides })

export const fakeEvent = ({
  device_id
}: Pick<Device, 'device_id'>): Omit<VehicleEvent, 'recorded' | 'provider_id'> => ({
  device_id,
  event_types: ['service_start'],
  vehicle_state: 'available',
  trip_state: null,
  telemetry: TEST_TELEMETRY({ device_id }),
  timestamp: now()
})

export const registerVehicleRequest = (
  request: supertest.SuperTest<supertest.Test>,
  vehicle: Omit<Device, 'recorded'>
) => request.post(`/agency/vehicles`).set('Authorization', AUTH).send(vehicle).expect(201)

export const postEventRequest = (
  request: supertest.SuperTest<supertest.Test>,
  event: Omit<VehicleEvent, 'recorded' | 'provider_id'>
) => request.post(`/agency/vehicles/${event.device_id}/event`).set('Authorization', AUTH).send(event).expect(201)

export const postEvent = (
  request: supertest.SuperTest<supertest.Test>,
  eventsContext: POSTableVehicleEvent[],
  device: Omit<Device, 'recorded'>,
  overrides?: Partial<POSTableVehicleEvent>
) => {
  const event = { ...fakeEvent(device), ...overrides }
  const result = postEventRequest(request, event)
  eventsContext.push(event)
  return { result, event }
}

export const fakeTripMetadata: (
  overrides?: Partial<Omit<TripMetadata, 'provider_id'>>
) => Omit<TripMetadata, 'provider_id'> = overrides => ({
  trip_id: uuid(),
  reservation_time: now(),
  dispatch_time: now(),
  trip_start_time: now(),
  requested_trip_start_location: {
    lat: 37.3382,
    lng: -121.8863
  },
  quoted_trip_start_time: now(),
  trip_end_time: now(),
  distance: 0,
  accessibility_options: [],
  fare: {
    quoted_cost: 2000,
    actual_cost: 2500,
    components: {},
    currency: 'USD',
    payment_methods: ['cash', 'card']
  },
  reservation_type: 'on_demand',
  reservation_method: 'phone_dispatch',
  ...overrides
})

export const postTripMetadata = (
  request: supertest.SuperTest<supertest.Test>,
  metadata: Omit<TripMetadata, 'provider_id'>
) => {
  return request.post(`/agency/trips`).set('Authorization', AUTH).send(metadata).expect(201)
}

/**
 *
 * @param events Event sequence to use for Trip construction
 * @param overrides Overrides to apply to the metadata
 */
export const constructTripMetadata = (
  events: POSTableVehicleEvent[],
  overrides?: Partial<Omit<TripMetadata, 'provider_id'>>
) => {
  const reservation_time = events.find(x => x.event_types.includes('reservation_start'))?.timestamp
  const dispatch_time = reservation_time

  const trip_start_time = events.find(x => x.event_types.includes('trip_start'))?.timestamp
  const quoted_trip_start_time = trip_start_time

  const trip_id = events.find(x => x.trip_id)?.trip_id ?? undefined

  return fakeTripMetadata({
    trip_id,
    reservation_time,
    trip_start_time,
    dispatch_time,
    quoted_trip_start_time,
    ...overrides
  })
}

/**
 * Kicks off a "standard" trip flow.
 *
 * @param eventsContext Contextual array where events should be pushed.
 * This _will_ mutate outside of the scope of this function,
 * in order to power things such as the TripMetadata constructor
 * @param vehicle
 */
export const basicTripFlow = async (
  request: supertest.SuperTest<supertest.Test>,
  eventsContext: POSTableVehicleEvent[],
  vehicle: Omit<Device, 'recorded'>,
  trip_id: UUID = uuid()
) => {
  await postEvent(request, eventsContext, vehicle, { event_types: ['service_start'], vehicle_state: 'available' })

  await postEvent(request, eventsContext, vehicle, {
    event_types: ['reservation_start'],
    vehicle_state: 'reserved',
    trip_state: 'reserved',
    trip_id
  })

  await postEvent(request, eventsContext, vehicle, {
    event_types: ['reservation_stop'],
    vehicle_state: 'stopped',
    trip_state: 'stopped',
    trip_id
  })

  await postEvent(request, eventsContext, vehicle, {
    event_types: ['trip_start'],
    vehicle_state: 'on_trip',
    trip_state: 'on_trip',
    trip_id
  })

  await postEvent(request, eventsContext, vehicle, {
    event_types: ['trip_stop'],
    vehicle_state: 'stopped',
    trip_state: 'stopped',
    trip_id
  })

  await postEvent(request, eventsContext, vehicle, {
    event_types: ['trip_end'],
    vehicle_state: 'available',
    trip_id
  })
}
