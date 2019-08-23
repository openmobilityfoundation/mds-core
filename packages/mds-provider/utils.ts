import { StatusChangeEvent } from '@mds-core/mds-db/types'
import {
  VEHICLE_EVENTS,
  PROVIDER_EVENTS,
  PROVIDER_REASONS,
  VEHICLE_REASONS,
  VehicleEvent,
  VEHICLE_EVENT,
  VEHICLE_REASON
} from '@mds-core/mds-types'

const AgencyEventMap: {
  [E in VEHICLE_EVENT]: {
    when: Partial<{ [R in VEHICLE_REASON]: StatusChangeEvent }>
  } & { otherwise: StatusChangeEvent }
} = {
  [VEHICLE_EVENTS.register]: {
    when: {},
    otherwise: {
      event_type: PROVIDER_EVENTS.removed,
      event_type_reason: PROVIDER_REASONS.service_end
    }
  },
  [VEHICLE_EVENTS.service_start]: {
    when: {},
    otherwise: {
      event_type: PROVIDER_EVENTS.available,
      event_type_reason: PROVIDER_REASONS.service_start
    }
  },
  [VEHICLE_EVENTS.service_end]: {
    when: {
      [VEHICLE_REASONS.low_battery]: {
        event_type: PROVIDER_EVENTS.unavailable,
        event_type_reason: PROVIDER_REASONS.low_battery
      }
    },
    otherwise: {
      event_type: PROVIDER_EVENTS.unavailable,
      event_type_reason: PROVIDER_REASONS.maintenance
    }
  },
  [VEHICLE_EVENTS.provider_drop_off]: {
    when: {},
    otherwise: {
      event_type: PROVIDER_EVENTS.available,
      event_type_reason: PROVIDER_REASONS.rebalance_drop_off
    }
  },
  [VEHICLE_EVENTS.provider_pick_up]: {
    when: {
      [VEHICLE_REASONS.rebalance]: {
        event_type: PROVIDER_EVENTS.removed,
        event_type_reason: PROVIDER_REASONS.rebalance_pick_up
      },
      [VEHICLE_REASONS.maintenance]: {
        event_type: PROVIDER_EVENTS.removed,
        event_type_reason: PROVIDER_REASONS.maintenance_pick_up
      },
      [VEHICLE_REASONS.charge]: {
        event_type: PROVIDER_EVENTS.removed,
        event_type_reason: PROVIDER_REASONS.maintenance_pick_up
      }
    },
    otherwise: {
      event_type: PROVIDER_EVENTS.removed,
      event_type_reason: PROVIDER_REASONS.service_end
    }
  },
  [VEHICLE_EVENTS.agency_drop_off]: {
    when: {},
    otherwise: {
      event_type: PROVIDER_EVENTS.available,
      event_type_reason: PROVIDER_REASONS.agency_drop_off
    }
  },
  [VEHICLE_EVENTS.agency_pick_up]: {
    when: {},
    otherwise: {
      event_type: PROVIDER_EVENTS.removed,
      event_type_reason: PROVIDER_REASONS.agency_pick_up
    }
  },
  [VEHICLE_EVENTS.reserve]: {
    when: {},
    otherwise: {
      event_type: PROVIDER_EVENTS.reserved,
      event_type_reason: PROVIDER_REASONS.user_pick_up
    }
  },
  [VEHICLE_EVENTS.cancel_reservation]: {
    when: {},
    otherwise: {
      event_type: PROVIDER_EVENTS.available,
      event_type_reason: PROVIDER_REASONS.user_drop_off
    }
  },
  [VEHICLE_EVENTS.trip_start]: {
    when: {},
    otherwise: {
      event_type: PROVIDER_EVENTS.reserved,
      event_type_reason: PROVIDER_REASONS.user_pick_up
    }
  },
  [VEHICLE_EVENTS.trip_enter]: {
    when: {},
    otherwise: {
      event_type: PROVIDER_EVENTS.reserved,
      event_type_reason: PROVIDER_REASONS.user_pick_up
    }
  },
  [VEHICLE_EVENTS.trip_leave]: {
    when: {},
    otherwise: {
      event_type: PROVIDER_EVENTS.removed,
      event_type_reason: PROVIDER_REASONS.service_end
    }
  },
  [VEHICLE_EVENTS.trip_end]: {
    when: {},
    otherwise: {
      event_type: PROVIDER_EVENTS.available,
      event_type_reason: PROVIDER_REASONS.user_drop_off
    }
  },
  [VEHICLE_EVENTS.deregister]: {
    when: {},
    otherwise: {
      event_type: PROVIDER_EVENTS.removed,
      event_type_reason: PROVIDER_REASONS.service_end
    }
  }
}

export function asStatusChangeEvent({
  event_type,
  event_type_reason
}: Pick<VehicleEvent, 'event_type' | 'event_type_reason'>): StatusChangeEvent {
  const map = AgencyEventMap[event_type]
  if (map) {
    const { otherwise, when } = map
    return (event_type_reason ? when[event_type_reason] : undefined) || otherwise
  }
  throw Error(`No computable state for "${event_type}${event_type_reason ? `/${event_type_reason}` : ''}"`)
}
