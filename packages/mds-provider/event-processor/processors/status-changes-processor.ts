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

import db from '@mds-core/mds-db'
import logger from '@mds-core/mds-logger'
import { Feature, Point } from 'geojson'
import { round, now } from '@mds-core/mds-utils'
import { PROPULSION_TYPE, VEHICLE_TYPE, Telemetry, VehicleEvent } from '@mds-core/mds-types'
import { StatusChange } from '@mds-core/mds-db/types'
import { LabeledStreamEntry } from '../types'
import { DeviceLabel } from '../labelers/device-labeler'
import { ProviderLabel } from '../labelers/provider-labeler'
import { asStatusChangeEvent } from '../../utils'

export type StatusChangesProcessorStreamEntry = LabeledStreamEntry<ProviderLabel & DeviceLabel, VehicleEvent>

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

const asStatusChange = (entry: StatusChangesProcessorStreamEntry): StatusChange => {
  const {
    data: event,
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
    recorded: now()
  }
}

export const StatusChangesProcessor = async (entries: StatusChangesProcessorStreamEntry[]): Promise<void> => {
  if (entries.length > 0) {
    const recorded_status_changes = await db.writeStatusChanges(entries.map(asStatusChange))
    logger.info(
      `|- Status Changes Processor: Created ${recorded_status_changes.length}/${entries.length} status ${
        entries.length === 1 ? 'change' : 'changes'
      }`
    )
  }
}
