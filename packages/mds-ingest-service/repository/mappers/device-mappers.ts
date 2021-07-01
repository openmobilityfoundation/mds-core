/**
 * Copyright 2020 City of Los Angeles
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

import { IdentityColumn, ModelMapper, RecordedColumn } from '@mds-core/mds-repository'
import { Timestamp } from '@mds-core/mds-types'
import { DeviceDomainCreateModel, DeviceDomainModel } from '../../@types'
import { DeviceEntityModel } from '../entities/device-entity'

type DeviceEntityToDomainOptions = Partial<{}>

export const DeviceEntityToDomain = ModelMapper<DeviceEntityModel, DeviceDomainModel, DeviceEntityToDomainOptions>(
  (entity, options) => {
    const { id, ...domain } = entity
    return { ...domain }
  }
)

type DeviceEntityCreateOptions = Partial<{
  recorded: Timestamp
}>

export type DeviceEntityCreateModel = Omit<DeviceEntityModel, keyof IdentityColumn | keyof RecordedColumn>

export const DeviceDomainToEntityCreate = ModelMapper<
  DeviceDomainCreateModel,
  DeviceEntityCreateModel,
  DeviceEntityCreateOptions
>(({ year = null, mfgr = null, model = null, accessibility_options = null, ...domain }, options) => {
  const { recorded } = options ?? {}
  return { year, mfgr, model, recorded, accessibility_options, ...domain }
})
