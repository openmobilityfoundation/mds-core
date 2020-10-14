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

import { Entity, Column, Index } from 'typeorm'
import { Nullable } from '@mds-core/mds-types'
import { IdentityColumn, RecordedColumn } from '@mds-core/mds-repository'
import { JurisdictionDomainModel } from '../../@types'

export interface JurisdictionVersionedProperties {
  timestamp: JurisdictionDomainModel['timestamp']
  agency_name: JurisdictionDomainModel['agency_name']
  geography_id: Nullable<JurisdictionDomainModel['geography_id']>
}

export interface JurisdictionEntityModel extends IdentityColumn, RecordedColumn {
  jurisdiction_id: JurisdictionDomainModel['jurisdiction_id']
  agency_key: JurisdictionDomainModel['agency_key']
  versions: JurisdictionVersionedProperties[]
}

@Entity('jurisdictions')
export class JurisdictionEntity extends IdentityColumn(RecordedColumn(class {})) implements JurisdictionEntityModel {
  @Column('uuid', { primary: true })
  jurisdiction_id: JurisdictionEntityModel['jurisdiction_id']

  @Column('varchar', { length: 63 })
  @Index({ unique: true })
  agency_key: JurisdictionEntityModel['agency_key']

  @Column('json')
  versions: JurisdictionVersionedProperties[]
}
