import { StatusChangeEvent } from '@mds-core/mds-db/types'
import { VEHICLE_EVENTS, PROVIDER_EVENTS, PROVIDER_REASONS, VEHICLE_REASONS, VehicleEvent } from '@mds-core/mds-types'

export function asStatusChangeEvent({
  event_type,
  event_type_reason
}: Pick<VehicleEvent, 'event_type' | 'event_type_reason'>): StatusChangeEvent {
  switch (event_type) {
    case VEHICLE_EVENTS.register: {
      return {
        event_type: PROVIDER_EVENTS.removed,
        event_type_reason: PROVIDER_REASONS.service_end
      }
    }
    case VEHICLE_EVENTS.service_start: {
      return {
        event_type: PROVIDER_EVENTS.available,
        event_type_reason: PROVIDER_REASONS.service_start
      }
    }
    case VEHICLE_EVENTS.service_end: {
      switch (event_type_reason) {
        case VEHICLE_REASONS.low_battery: {
          return {
            event_type: PROVIDER_EVENTS.unavailable,
            event_type_reason: PROVIDER_REASONS.low_battery
          }
        }
        case VEHICLE_REASONS.maintenance: {
          return {
            event_type: PROVIDER_EVENTS.unavailable,
            event_type_reason: PROVIDER_REASONS.maintenance
          }
        }
        default: {
          return {
            event_type: PROVIDER_EVENTS.removed,
            event_type_reason: PROVIDER_REASONS.service_end
          }
        }
      }
    }
    case VEHICLE_EVENTS.provider_drop_off: {
      return {
        event_type: PROVIDER_EVENTS.available,
        event_type_reason: PROVIDER_REASONS.rebalance_drop_off
      }
    }
    case VEHICLE_EVENTS.provider_pick_up: {
      switch (event_type_reason) {
        case VEHICLE_REASONS.rebalance: {
          return {
            event_type: PROVIDER_EVENTS.removed,
            event_type_reason: PROVIDER_REASONS.rebalance_pick_up
          }
        }
        case VEHICLE_REASONS.maintenance:
        case VEHICLE_REASONS.charge: {
          return {
            event_type: PROVIDER_EVENTS.removed,
            event_type_reason: PROVIDER_REASONS.maintenance_pick_up
          }
        }
        default: {
          return {
            event_type: PROVIDER_EVENTS.removed,
            event_type_reason: PROVIDER_REASONS.service_end
          }
        }
      }
    }
    case VEHICLE_EVENTS.agency_drop_off: {
      return {
        event_type: PROVIDER_EVENTS.available,
        event_type_reason: PROVIDER_REASONS.agency_drop_off
      }
    }
    case VEHICLE_EVENTS.agency_pick_up: {
      return {
        event_type: PROVIDER_EVENTS.removed,
        event_type_reason: PROVIDER_REASONS.agency_pick_up
      }
    }
    case VEHICLE_EVENTS.reserve: {
      return {
        event_type: PROVIDER_EVENTS.reserved,
        event_type_reason: PROVIDER_REASONS.user_pick_up
      }
    }
    case VEHICLE_EVENTS.cancel_reservation: {
      return {
        event_type: PROVIDER_EVENTS.available,
        event_type_reason: PROVIDER_REASONS.user_drop_off
      }
    }
    case VEHICLE_EVENTS.trip_start: {
      return {
        event_type: PROVIDER_EVENTS.reserved,
        event_type_reason: PROVIDER_REASONS.user_pick_up
      }
    }
    case VEHICLE_EVENTS.trip_enter: {
      return {
        event_type: PROVIDER_EVENTS.reserved,
        event_type_reason: PROVIDER_REASONS.user_pick_up
      }
    }
    case VEHICLE_EVENTS.trip_leave: {
      return {
        event_type: PROVIDER_EVENTS.reserved,
        event_type_reason: PROVIDER_REASONS.user_pick_up
      }
    }
    case VEHICLE_EVENTS.trip_end: {
      return {
        event_type: PROVIDER_EVENTS.available,
        event_type_reason: PROVIDER_REASONS.user_drop_off
      }
    }
    case VEHICLE_EVENTS.deregister: {
      return {
        event_type: PROVIDER_EVENTS.removed,
        event_type_reason: PROVIDER_REASONS.service_end
      }
    }
    default:
      throw Error(`No computable state for "${event_type}"`)
  }
}
