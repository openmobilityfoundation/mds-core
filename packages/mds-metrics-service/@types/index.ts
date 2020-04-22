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

import { Timestamp, UUID, VEHICLE_TYPE, SingleOrArray, Nullable } from '@mds-core/mds-types'
import { ServiceResponse } from '@mds-core/mds-service-helpers'

export interface MetricDomainModel {
  name: string
  time_bin_size: Timestamp
  time_bin_start: Timestamp
  provider_id: UUID
  geography_id: Nullable<UUID>
  vehicle_type: VEHICLE_TYPE
  count: number
  sum: number
  min: number
  max: number
  avg: number
}

export interface ReadMetricsTimeOptions {
  time_bin_size: number
  time_bin_start: Timestamp
  time_bin_end?: Timestamp
}

export interface ReadMetricsFilterOptions {
  provider_id: SingleOrArray<UUID>
  geography_id: SingleOrArray<UUID>
  vehicle_type: SingleOrArray<VEHICLE_TYPE>
}

export interface ReadMetricsOptions extends ReadMetricsTimeOptions, Partial<ReadMetricsFilterOptions> {
  name: string
}

export interface MetricsServiceInterface {
  writeMetrics: (metrics: MetricDomainModel[]) => Promise<ServiceResponse<MetricDomainModel[]>>
  readMetrics: (options: ReadMetricsOptions) => Promise<ServiceResponse<MetricDomainModel[]>>
}
