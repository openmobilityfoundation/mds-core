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

import { Timestamp, UUID, VehicleEvent } from '@mds-core/mds-types'

export type ReadStreamOptions = Partial<{
  count: number
  block: number
  noack: boolean
}>

export const Streams = ['device:index', 'device:raw'] as const
export const [DEVICE_INDEX_STREAM, DEVICE_RAW_STREAM] = Streams
export type Stream = typeof Streams[number]

export type StreamItemID = string
export type StreamItemType = string
export type StreamItemData = string
export type StreamItem = [StreamItemID, [StreamItemType, StreamItemData]]
export type ReadStreamResult = [Stream, StreamItem[]]

export interface BadDataError {
  recorded: Timestamp
  provider_id: UUID
  error_message: string
  data: Partial<VehicleEvent>
}
