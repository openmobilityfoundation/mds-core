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
import { Device, UUID } from 'mds'
import { isUUID } from 'mds-utils'
import { StreamEntry, StreamEntryLabels } from '../types'

export interface DeviceLabel {
  device: Device
}

type DeviceStreamEntry = StreamEntry<{ device_id: UUID }>

export const isDeviceEntry = (entry: StreamEntry): entry is DeviceStreamEntry =>
  entry &&
  typeof entry === 'object' &&
  typeof entry.data === 'object' &&
  isUUID((entry as DeviceStreamEntry).data.device_id)

export const DeviceLabeler = async (entries: StreamEntry[]): Promise<StreamEntryLabels<DeviceLabel>> => {
  const device_entries = entries.filter(isDeviceEntry)

  if (device_entries.length > 0) {
    // Get unique device ids from all entries
    const device_ids = [...new Set(device_entries.map(entry => entry.data.device_id))]

    // Load the devices
    const devices: Device[] = await db.readDeviceList(device_ids)

    // Create a device map
    const device_map = devices.reduce<{ [device_id: string]: Device }>(
      (map, device) => ({ ...map, [device.device_id]: device }),
      {}
    )

    logger.info(`Device Labeler: Labeled ${Object.keys(device_map).length}/${device_ids.length} devices`)

    // Create the device labels
    return device_entries.reduce(
      (labels, entry) => ({ ...labels, [entry.id]: { device: device_map[entry.data.device_id] } }),
      {}
    )
  }

  return {}
}
