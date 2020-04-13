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

import { Timestamp } from '@mds-core/mds-types'
import { MetricEntityModel } from '../repository/entities/metric-entity'
import { MetricDomainModel } from '../../@types'

export const asMetricDomainModel = ({ id, recorded, ...entity }: MetricEntityModel): MetricDomainModel => entity

export const asMetricEntityModel = (recorded: Timestamp) => (
  entity: MetricDomainModel
): Omit<MetricEntityModel, 'id'> => ({
  ...entity,
  recorded
})
