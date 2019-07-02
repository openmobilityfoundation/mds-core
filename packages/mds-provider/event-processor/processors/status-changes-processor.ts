/*
    Copyright 2019 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import db from 'mds-db'
import logger from 'mds-logger'
import { Feature, Point } from 'geojson'
import { round } from 'mds-utils'
import { PROPULSION_TYPE, VEHICLE_TYPE } from 'mds-enums'
import { Telemetry, VehicleEvent } from 'mds'
import { StatusChange } from 'mds-db/types'
import { LabeledStreamEntry } from '../types'
import { DeviceLabel } from '../labelers/device-labeler'
import { ProviderLabel } from '../labelers/provider-labeler'
import { asStatusChangeEvent } from '../../utils'

const asPointFeature = (telemetry?: Telemetry | null): Feature<Point> | null => {
  return telemetry && telemetry.gps
    ? {
        type: 'Feature',
        properties: {
          timestamp: telemetry.timestamp
        },
        geometry: {
          type: 'Point',
          coordinates: [round(telemetry.gps.lng, 6), round(telemetry.gps.lat, 6)]
        }
      }
    : null
}

type StatusChangesProcessorEntry = LabeledStreamEntry<ProviderLabel & DeviceLabel, VehicleEvent, 'event'>

function asStatusChange(entry: StatusChangesProcessorEntry): StatusChange {
  const {
    data: event,
    recorded,
    sequence,
    labels: { provider, device }
  } = entry
  const { telemetry, trip_id, timestamp: event_time } = event
  const { provider_name } = provider
  const { provider_id, device_id, vehicle_id, type: vehicle_type, propulsion: propulsion_type } = device
  const { event_type, event_type_reason } = asStatusChangeEvent(event)

  return {
    provider_id,
    provider_name,
    device_id,
    vehicle_id,
    vehicle_type: vehicle_type as VEHICLE_TYPE,
    propulsion_type: propulsion_type as PROPULSION_TYPE[],
    event_type,
    event_type_reason,
    event_time,
    event_location: asPointFeature(telemetry),
    battery_pct: (telemetry && telemetry.charge) || null,
    associated_trip: trip_id || null,
    recorded,
    sequence
  }
}

const isVehicleEventEntry = (
  entry: LabeledStreamEntry<ProviderLabel & DeviceLabel>
): entry is LabeledStreamEntry<ProviderLabel & DeviceLabel, VehicleEvent, 'event'> =>
  entry && typeof entry === 'object' && entry.type === 'event' && typeof entry.data === 'object'

const StatusChangeEventProcessor = async (entries: StatusChangesProcessorEntry[]): Promise<void> => {
  if (entries.length > 0) {
    await db.writeStatusChanges(entries.map(asStatusChange))
    logger.info(`Status Changes Processor: Created ${entries.length} status changes`)
  }
}

export const StatusChangesProcessor = async (
  entries: LabeledStreamEntry<ProviderLabel & DeviceLabel>[]
): Promise<void> => {
  await StatusChangeEventProcessor(entries.filter(isVehicleEventEntry))
}
