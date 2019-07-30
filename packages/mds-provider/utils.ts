import { StatusChangeEvent } from '@mds-core/mds-db/types'
import { VEHICLE_EVENTS, VEHICLE_STATUSES, VEHICLE_REASONS, VehicleEvent } from '@mds-core/mds-types'

export function asStatusChangeEvent({ event_type }: VehicleEvent | { event_type: string }): StatusChangeEvent {
  // const agencyEventReason = agencyEvent.event_type_reason

  // event_type: 'removed',
  //     event_type_reason: 'service_end'
  //     event_type_reason: 'rebalance_pick_up'
  //     event_type_reason: 'maintenance_pick_up'

  // event_type: 'available',
  //     event_type_reason: 'service_start'
  //     event_type_reason: 'user_drop_off'
  //     event_type_reason: 'rebalance_drop_off'
  //     event_type_reason: 'maintenance_drop_off'

  // event_type: 'reserved',
  //     event_type_reason: 'user_pick_up'

  // event_type: 'unavailable',
  //     event_type_reason: 'low_battery'
  //     event_type_reason: 'maintenance'

  // TODO: any strings in the case values are legacy sandbox crud
  // and should eventually be removed
  switch (event_type) {
    case 'register':
    case 'maintenance_pick_up':
    case 'deactivate':
    case 'maintenance':
      return {
        event_type: VEHICLE_STATUSES.removed,
        event_type_reason: VEHICLE_EVENTS.service_end
      }

    case 'rebalance_drop_off':
    case 'provider_drop_off':
    case 'maintenance_drop_off':
      return {
        event_type: VEHICLE_STATUSES.available,
        event_type_reason: VEHICLE_EVENTS.provider_drop_off
      }

    case 'low_battery':
      return {
        event_type: VEHICLE_STATUSES.unavailable,
        event_type_reason: VEHICLE_REASONS.low_battery
      }
    case VEHICLE_EVENTS.agency_pick_up:
    case VEHICLE_EVENTS.deregister:
    case VEHICLE_EVENTS.service_end:
    case VEHICLE_EVENTS.register:
      return {
        event_type: VEHICLE_STATUSES.removed,
        event_type_reason: VEHICLE_EVENTS.service_end
      }

    case VEHICLE_EVENTS.service_start:
      return {
        event_type: VEHICLE_STATUSES.available,
        event_type_reason: VEHICLE_EVENTS.service_start
      }

    case VEHICLE_EVENTS.cancel_reservation:
    case VEHICLE_EVENTS.trip_end:
      return {
        event_type: VEHICLE_STATUSES.available,
        event_type_reason: VEHICLE_EVENTS.user_drop_off
      }

    case VEHICLE_EVENTS.provider_drop_off:
      return {
        event_type: VEHICLE_STATUSES.available,
        event_type_reason: event_type // rebalance_drop_off or maintenance_drop_off
      }

    case VEHICLE_EVENTS.reserve:
    case VEHICLE_EVENTS.trip_start:
    case VEHICLE_EVENTS.trip_leave:
    case VEHICLE_EVENTS.trip_enter:
      return {
        event_type: VEHICLE_STATUSES.reserved,
        event_type_reason: VEHICLE_EVENTS.trip_start
      }

    case VEHICLE_EVENTS.provider_pick_up:
      return {
        event_type: VEHICLE_STATUSES.unavailable,
        event_type_reason: VEHICLE_REASONS.maintenance
      }

    default:
      throw new Error(`no computable state for "${event_type}"`)
  }
}
