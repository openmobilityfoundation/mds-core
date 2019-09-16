import {
  VehicleEvent,
  PROVIDER_REASONS,
  VEHICLE_EVENTS,
  PROVIDER_EVENTS,
  VEHICLE_REASONS,
  VEHICLE_EVENT
} from '@mds-core/mds-types'
import { StatusChangeEvent } from '@mds-core/mds-db/types'
import test from 'unit.js'
import { asStatusChangeEvent } from '../utils'

const fixtures: {
  agency: Pick<VehicleEvent, 'event_type' | 'event_type_reason'>
  provider: StatusChangeEvent
}[] = [
  {
    agency: { event_type: VEHICLE_EVENTS.register },
    provider: { event_type: PROVIDER_EVENTS.removed, event_type_reason: PROVIDER_REASONS.service_end }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.service_start },
    provider: { event_type: PROVIDER_EVENTS.available, event_type_reason: PROVIDER_REASONS.service_start }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.service_end },
    provider: { event_type: PROVIDER_EVENTS.unavailable, event_type_reason: PROVIDER_REASONS.maintenance }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.service_end, event_type_reason: VEHICLE_REASONS.low_battery },
    provider: { event_type: PROVIDER_EVENTS.unavailable, event_type_reason: PROVIDER_REASONS.low_battery }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.service_end, event_type_reason: VEHICLE_REASONS.maintenance },
    provider: { event_type: PROVIDER_EVENTS.unavailable, event_type_reason: PROVIDER_REASONS.maintenance }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.service_end, event_type_reason: VEHICLE_REASONS.compliance },
    provider: { event_type: PROVIDER_EVENTS.unavailable, event_type_reason: PROVIDER_REASONS.maintenance }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.service_end, event_type_reason: VEHICLE_REASONS.off_hours },
    provider: { event_type: PROVIDER_EVENTS.unavailable, event_type_reason: PROVIDER_REASONS.maintenance }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.provider_drop_off },
    provider: { event_type: PROVIDER_EVENTS.available, event_type_reason: PROVIDER_REASONS.rebalance_drop_off }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.provider_pick_up },
    provider: { event_type: PROVIDER_EVENTS.removed, event_type_reason: PROVIDER_REASONS.service_end }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.provider_pick_up, event_type_reason: VEHICLE_REASONS.rebalance },
    provider: { event_type: PROVIDER_EVENTS.removed, event_type_reason: PROVIDER_REASONS.rebalance_pick_up }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.provider_pick_up, event_type_reason: VEHICLE_REASONS.maintenance },
    provider: { event_type: PROVIDER_EVENTS.removed, event_type_reason: PROVIDER_REASONS.maintenance_pick_up }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.provider_pick_up, event_type_reason: VEHICLE_REASONS.charge },
    provider: { event_type: PROVIDER_EVENTS.removed, event_type_reason: PROVIDER_REASONS.maintenance_pick_up }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.provider_pick_up, event_type_reason: VEHICLE_REASONS.compliance },
    provider: { event_type: PROVIDER_EVENTS.removed, event_type_reason: PROVIDER_REASONS.service_end }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.agency_drop_off },
    provider: { event_type: PROVIDER_EVENTS.available, event_type_reason: PROVIDER_REASONS.agency_drop_off }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.agency_pick_up },
    provider: { event_type: PROVIDER_EVENTS.removed, event_type_reason: PROVIDER_REASONS.agency_pick_up }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.reserve },
    provider: { event_type: PROVIDER_EVENTS.reserved, event_type_reason: PROVIDER_REASONS.user_pick_up }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.cancel_reservation },
    provider: { event_type: PROVIDER_EVENTS.available, event_type_reason: PROVIDER_REASONS.user_drop_off }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.trip_start },
    provider: { event_type: PROVIDER_EVENTS.reserved, event_type_reason: PROVIDER_REASONS.user_pick_up }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.trip_enter },
    provider: { event_type: PROVIDER_EVENTS.reserved, event_type_reason: PROVIDER_REASONS.user_pick_up }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.trip_leave },
    provider: { event_type: PROVIDER_EVENTS.removed, event_type_reason: PROVIDER_REASONS.service_end }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.trip_end },
    provider: { event_type: PROVIDER_EVENTS.available, event_type_reason: PROVIDER_REASONS.user_drop_off }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.deregister },
    provider: { event_type: PROVIDER_EVENTS.removed, event_type_reason: PROVIDER_REASONS.service_end }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.deregister, event_type_reason: VEHICLE_REASONS.missing },
    provider: { event_type: PROVIDER_EVENTS.removed, event_type_reason: PROVIDER_REASONS.service_end }
  },
  {
    agency: { event_type: VEHICLE_EVENTS.deregister, event_type_reason: VEHICLE_REASONS.decommissioned },
    provider: { event_type: PROVIDER_EVENTS.removed, event_type_reason: PROVIDER_REASONS.service_end }
  }
]

describe('Testing Mapping of Agency Events to Provider Status Changes', () => {
  before(done => {
    fixtures.forEach(({ agency, provider }) =>
      // eslint-disable-next-line no-console
      console.log(
        `\t`,
        agency.event_type_reason ? `${agency.event_type}/${agency.event_type_reason}` : agency.event_type,
        '=>',
        `${provider.event_type}/${provider.event_type_reason}`
      )
    )
    done()
    /* eslint-enable no-console */
  })

  for (const { agency, provider } of fixtures) {
    it(`Testing ${agency.event_type}${
      agency.event_type_reason ? `/${agency.event_type_reason}` : ''
    } Agency Event`, done => {
      test.object(asStatusChangeEvent(agency)).is(provider)
      done()
    })
  }

  it('Testing Bad Agency Event', done => {
    test.assert.throws(() => asStatusChangeEvent({ event_type: 'bad-event' as VEHICLE_EVENT }), Error)
    done()
  })
})
