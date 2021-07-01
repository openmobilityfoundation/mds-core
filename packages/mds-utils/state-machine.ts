/**
 * Copyright 2019 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  MicroMobilityVehicleEvent,
  MICRO_MOBILITY_EVENT_STATES_MAP,
  MICRO_MOBILITY_VEHICLE_EVENT,
  MICRO_MOBILITY_VEHICLE_STATE,
  MICRO_MOBILITY_VEHICLE_STATES,
  VEHICLE_EVENT
} from '@mds-core/mds-types'

/* Start with a state, then there's a list of valid event_types by which one
 * may transition out, then possible states for each event_type
 */
const microMobilityStateTransitionDict: {
  [S in MICRO_MOBILITY_VEHICLE_STATE]: Partial<
    {
      [E in MICRO_MOBILITY_VEHICLE_EVENT]: MICRO_MOBILITY_VEHICLE_STATE[]
    }
  >
} = {
  available: {
    agency_pick_up: ['removed'],
    battery_low: ['non_operational'],
    comms_lost: ['unknown'],
    compliance_pick_up: ['removed'],
    decommissioned: ['removed'],
    maintenance: ['non_operational'],
    maintenance_pick_up: ['removed'],
    missing: ['unknown'],
    off_hours: ['non_operational'],
    rebalance_pick_up: ['removed'],
    reservation_start: ['reserved'],
    system_suspend: ['non_operational'],
    trip_start: ['on_trip'],
    unspecified: ['non_operational', 'unknown', 'removed']
  },
  elsewhere: {
    agency_drop_off: ['available'],
    agency_pick_up: ['removed'],
    comms_lost: ['unknown'],
    compliance_pick_up: ['removed'],
    decommissioned: ['removed'],
    maintenance_pick_up: ['removed'],
    missing: ['unknown'],
    provider_drop_off: ['available'],
    rebalance_pick_up: ['removed'],
    trip_enter_jurisdiction: ['on_trip'],
    unspecified: ['available', 'removed', 'unknown']
  },
  non_operational: {
    agency_pick_up: ['removed'],
    battery_charged: ['available'],
    comms_lost: ['unknown'],
    compliance_pick_up: ['removed'],
    decommissioned: ['removed'],
    maintenance: ['available'],
    maintenance_pick_up: ['removed'],
    missing: ['unknown'],
    on_hours: ['available'],
    rebalance_pick_up: ['removed'],
    system_resume: ['available'],
    unspecified: ['available', 'removed', 'unknown']
  },
  on_trip: {
    comms_lost: ['unknown'],
    trip_cancel: ['available'],
    trip_end: ['available'],
    trip_leave_jurisdiction: ['elsewhere'],
    missing: ['unknown'],
    unspecified: ['unknown']
  },
  removed: {
    comms_lost: ['unknown'],
    missing: ['unknown'],
    agency_drop_off: ['available'],
    decommissioned: ['removed'],
    provider_drop_off: ['available'],
    unspecified: ['unknown']
  },
  reserved: {
    comms_lost: ['unknown'],
    missing: ['unknown'],
    reservation_cancel: ['available'],
    trip_start: ['on_trip'],
    unspecified: ['unknown']
  },
  unknown: {
    agency_drop_off: ['available'],
    agency_pick_up: ['removed'],
    comms_restored: ['available', 'elsewhere', 'removed', 'reserved', 'on_trip', 'non_operational'],
    decommissioned: ['removed'],
    provider_drop_off: ['available'],
    unspecified: ['available', 'removed'],
    located: ['available', 'elsewhere', 'reserved', 'on_trip', 'non_operational']
  }
}

const getNextStates = (
  currStatus: MICRO_MOBILITY_VEHICLE_STATE,
  nextEvent: MICRO_MOBILITY_VEHICLE_EVENT
): MICRO_MOBILITY_VEHICLE_STATE[] | undefined => {
  return microMobilityStateTransitionDict[currStatus]?.[nextEvent]
}

// Filter for all states that have this event as a valid exiting event
function getValidPreviousStates(
  event: MICRO_MOBILITY_VEHICLE_EVENT,
  states: Readonly<MICRO_MOBILITY_VEHICLE_STATE[]> = MICRO_MOBILITY_VEHICLE_STATES
) {
  return states.filter(state => {
    return Object.keys(microMobilityStateTransitionDict[state]).includes(event)
  })
}

function isEventValid(event: MicroMobilityVehicleEvent) {
  const { event_types } = event
  const finalEventType: VEHICLE_EVENT = event_types[event_types.length - 1]
  return MICRO_MOBILITY_EVENT_STATES_MAP[finalEventType].includes(event.vehicle_state as MICRO_MOBILITY_VEHICLE_STATE)
}

function isEventSequenceValid(eventA: MicroMobilityVehicleEvent, eventB: MicroMobilityVehicleEvent) {
  let prevStates: MICRO_MOBILITY_VEHICLE_STATE[] = [eventA.vehicle_state]
  for (const eventTypeB of eventB.event_types) {
    const validPreviousStates = getValidPreviousStates(eventTypeB, prevStates)
    if (validPreviousStates.length > 0) {
      const nextStates = validPreviousStates.reduce((acc: MICRO_MOBILITY_VEHICLE_STATE[], state) => {
        const possibleNextStates = getNextStates(state, eventTypeB)
        if (possibleNextStates) {
          return [...acc, ...possibleNextStates]
        }
        return acc
      }, [])
      if (nextStates.length > 0) {
        prevStates = nextStates
      } else {
        return false
      }
    } else {
      return false
    }
  }
  return prevStates.includes(eventB.vehicle_state)
}

const generateTransitionLabel = (
  status: MICRO_MOBILITY_VEHICLE_STATE,
  nextStatus: MICRO_MOBILITY_VEHICLE_STATE,
  transitionEvent: MICRO_MOBILITY_VEHICLE_EVENT
) => {
  return `${status} -> ${nextStatus} [ label = ${transitionEvent} ]`
}

// Punch this output into http://www.webgraphviz.com/
const generateGraph = () => {
  const graphEntries = []
  const statuses: Readonly<MICRO_MOBILITY_VEHICLE_STATE[]> = MICRO_MOBILITY_VEHICLE_STATES
  for (const status of statuses) {
    const eventTransitions: MICRO_MOBILITY_VEHICLE_EVENT[] = Object.keys(
      microMobilityStateTransitionDict[status]
    ) as MICRO_MOBILITY_VEHICLE_EVENT[]
    for (const event of eventTransitions) {
      if (event) {
        const nextStatuses: Array<MICRO_MOBILITY_VEHICLE_STATE> | undefined =
          microMobilityStateTransitionDict[status][event]
        if (nextStatuses) {
          for (const nextStatus of nextStatuses) {
            graphEntries.push(`\t${generateTransitionLabel(status, nextStatus, event)}`)
          }
        }
      }
    }
  }
  return `digraph G {\n${graphEntries.join('\n')}\n}`
}

export {
  getValidPreviousStates,
  isEventValid,
  isEventSequenceValid,
  microMobilityStateTransitionDict as stateTransitionDict,
  getNextStates,
  generateGraph
}
