/*
    Copyright 2019-2020 City of Los Angeles.

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

import { UUID, Timestamp, Optional } from '@mds-core/mds-types'
import { RpcServiceDefinition, RpcRoute } from '@mds-core/mds-rpc-common'

export interface JurisdictionDomainModel {
  jurisdiction_id: UUID
  agency_key: string
  agency_name: string
  geography_id: UUID
  timestamp: Timestamp
}

export type JurisdictionIdType = JurisdictionDomainModel['jurisdiction_id']

export type CreateJurisdictionDomainModel = Optional<JurisdictionDomainModel, 'jurisdiction_id' | 'timestamp'>

export type UpdateJurisdictionDomainModel = Partial<JurisdictionDomainModel>

export type GetJurisdictionsOptions = Partial<{
  effective: Timestamp
}>

export interface JurisdictionService {
  createJurisdiction: (jurisdiction: CreateJurisdictionDomainModel) => JurisdictionDomainModel
  createJurisdictions: (jurisdictions: CreateJurisdictionDomainModel[]) => JurisdictionDomainModel[]
  updateJurisdiction: (
    jurisdiction_id: JurisdictionIdType,
    update: UpdateJurisdictionDomainModel
  ) => JurisdictionDomainModel
  deleteJurisdiction: (jurisdiction_id: JurisdictionIdType) => Pick<JurisdictionDomainModel, 'jurisdiction_id'>
  getJurisdictions: (options?: GetJurisdictionsOptions) => JurisdictionDomainModel[]
  getJurisdiction: (jurisdiction_id: JurisdictionIdType, options?: GetJurisdictionsOptions) => JurisdictionDomainModel
}

export const JurisdictionServiceDefinition: RpcServiceDefinition<JurisdictionService> = {
  createJurisdiction: RpcRoute<JurisdictionService['createJurisdiction']>(),
  createJurisdictions: RpcRoute<JurisdictionService['createJurisdictions']>(),
  updateJurisdiction: RpcRoute<JurisdictionService['updateJurisdiction']>(),
  deleteJurisdiction: RpcRoute<JurisdictionService['deleteJurisdiction']>(),
  getJurisdiction: RpcRoute<JurisdictionService['getJurisdiction']>(),
  getJurisdictions: RpcRoute<JurisdictionService['getJurisdictions']>()
}
