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
  [E in VEHICLE_EVENT]: { primary: StatusChangeEvent } & {
    secondary: Partial<{ [R in VEHICLE_REASON]: StatusChangeEvent }>
  }
} = {
  [VEHICLE_EVENTS.register]: {
    primary: {
      event_type: PROVIDER_EVENTS.removed,
      event_type_reason: PROVIDER_REASONS.service_end
    },
    secondary: {}
  },
  [VEHICLE_EVENTS.service_start]: {
    primary: {
      event_type: PROVIDER_EVENTS.available,
      event_type_reason: PROVIDER_REASONS.service_start
    },
    secondary: {}
  },
  [VEHICLE_EVENTS.service_end]: {
    primary: {
      event_type: PROVIDER_EVENTS.removed,
      event_type_reason: PROVIDER_REASONS.service_end
    },
    secondary: {
      [VEHICLE_REASONS.low_battery]: {
        event_type: PROVIDER_EVENTS.unavailable,
        event_type_reason: PROVIDER_REASONS.low_battery
      },
      [VEHICLE_REASONS.maintenance]: {
        event_type: PROVIDER_EVENTS.unavailable,
        event_type_reason: PROVIDER_REASONS.maintenance
      }
    }
  },
  [VEHICLE_EVENTS.provider_drop_off]: {
    primary: {
      event_type: PROVIDER_EVENTS.available,
      event_type_reason: PROVIDER_REASONS.rebalance_drop_off
    },
    secondary: {}
  },
  [VEHICLE_EVENTS.provider_pick_up]: {
    primary: {
      event_type: PROVIDER_EVENTS.removed,
      event_type_reason: PROVIDER_REASONS.service_end
    },
    secondary: {
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
    }
  },
  [VEHICLE_EVENTS.agency_drop_off]: {
    primary: {
      event_type: PROVIDER_EVENTS.available,
      event_type_reason: PROVIDER_REASONS.agency_drop_off
    },
    secondary: {}
  },
  [VEHICLE_EVENTS.agency_pick_up]: {
    primary: {
      event_type: PROVIDER_EVENTS.removed,
      event_type_reason: PROVIDER_REASONS.agency_pick_up
    },
    secondary: {}
  },
  [VEHICLE_EVENTS.reserve]: {
    primary: {
      event_type: PROVIDER_EVENTS.reserved,
      event_type_reason: PROVIDER_REASONS.user_pick_up
    },
    secondary: {}
  },
  [VEHICLE_EVENTS.cancel_reservation]: {
    primary: {
      event_type: PROVIDER_EVENTS.available,
      event_type_reason: PROVIDER_REASONS.user_drop_off
    },
    secondary: {}
  },
  [VEHICLE_EVENTS.trip_start]: {
    primary: {
      event_type: PROVIDER_EVENTS.reserved,
      event_type_reason: PROVIDER_REASONS.user_pick_up
    },
    secondary: {}
  },
  [VEHICLE_EVENTS.trip_enter]: {
    primary: {
      event_type: PROVIDER_EVENTS.reserved,
      event_type_reason: PROVIDER_REASONS.user_pick_up
    },
    secondary: {}
  },
  [VEHICLE_EVENTS.trip_leave]: {
    primary: {
      event_type: PROVIDER_EVENTS.reserved,
      event_type_reason: PROVIDER_REASONS.user_pick_up
    },
    secondary: {}
  },
  [VEHICLE_EVENTS.trip_end]: {
    primary: {
      event_type: PROVIDER_EVENTS.available,
      event_type_reason: PROVIDER_REASONS.user_drop_off
    },
    secondary: {}
  },
  [VEHICLE_EVENTS.deregister]: {
    primary: {
      event_type: PROVIDER_EVENTS.removed,
      event_type_reason: PROVIDER_REASONS.service_end
    },
    secondary: {}
  }
}

export function asStatusChangeEvent({
  event_type,
  event_type_reason
}: Pick<VehicleEvent, 'event_type' | 'event_type_reason'>): StatusChangeEvent {
  const map = AgencyEventMap[event_type]
  if (map) {
    const { primary, secondary } = map
    return (event_type_reason ? secondary[event_type_reason] : undefined) || primary
  }
  throw Error(`No computable state for "${event_type}${event_type_reason ? `/${event_type_reason}` : ''}"`)
}
