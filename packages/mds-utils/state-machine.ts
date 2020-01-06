import { VEHICLE_STATUSES, VEHICLE_EVENTS, VEHICLE_STATUS, VEHICLE_EVENT } from '@mds-core/mds-types'

const stateTransitionDict: {
  [S in VEHICLE_STATUS]: Partial<
    {
      [E in VEHICLE_EVENT]: VEHICLE_STATUS
    }
  >
} = {
  [VEHICLE_STATUSES.available]: {
    [VEHICLE_EVENTS.deregister]: VEHICLE_STATUSES.inactive,
    [VEHICLE_EVENTS.agency_pick_up]: VEHICLE_STATUSES.removed,
    [VEHICLE_EVENTS.service_end]: VEHICLE_STATUSES.unavailable,
    [VEHICLE_EVENTS.trip_start]: VEHICLE_STATUSES.trip
  },
  [VEHICLE_STATUSES.elsewhere]: {
    [VEHICLE_EVENTS.trip_enter]: VEHICLE_STATUSES.trip,
    [VEHICLE_EVENTS.provider_pick_up]: VEHICLE_STATUSES.removed,
    [VEHICLE_EVENTS.deregister]: VEHICLE_STATUSES.inactive,
    [VEHICLE_EVENTS.provider_drop_off]: VEHICLE_STATUSES.available
  },
  [VEHICLE_STATUSES.inactive]: {},
  [VEHICLE_STATUSES.removed]: {
    [VEHICLE_EVENTS.register]: VEHICLE_STATUSES.removed,
    [VEHICLE_EVENTS.trip_enter]: VEHICLE_STATUSES.trip,
    [VEHICLE_EVENTS.provider_drop_off]: VEHICLE_STATUSES.available,
    [VEHICLE_EVENTS.deregister]: VEHICLE_STATUSES.inactive
  },
  [VEHICLE_STATUSES.reserved]: {
    [VEHICLE_EVENTS.trip_start]: VEHICLE_STATUSES.trip,
    [VEHICLE_EVENTS.cancel_reservation]: VEHICLE_STATUSES.available
  },
  [VEHICLE_STATUSES.trip]: {
    [VEHICLE_EVENTS.trip_leave]: VEHICLE_STATUSES.elsewhere,
    [VEHICLE_EVENTS.trip_end]: VEHICLE_STATUSES.available
  },
  [VEHICLE_STATUSES.unavailable]: {
    [VEHICLE_EVENTS.service_start]: VEHICLE_STATUSES.available,
    [VEHICLE_EVENTS.deregister]: VEHICLE_STATUSES.inactive,
    [VEHICLE_EVENTS.agency_pick_up]: VEHICLE_STATUSES.removed,
    [VEHICLE_EVENTS.provider_pick_up]: VEHICLE_STATUSES.removed
  }
}

const getNextState = (currStatus: VEHICLE_STATUS, nextEvent: VEHICLE_EVENT): VEHICLE_STATUS | undefined => {
  return stateTransitionDict[currStatus]?.[nextEvent]
}

export { stateTransitionDict, getNextState }
