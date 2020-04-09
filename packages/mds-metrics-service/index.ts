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
import { ServiceResponse, ServiceResult, ServiceError } from '@mds-core/mds-service-helpers'
import logger from '@mds-core/mds-logger'
import { Timestamp } from '@mds-core/mds-types'
import * as orm from './orm'
import { MetricEntityModel } from './entities/metric-entity'
import { ReadMetricsTimeBinParameter, ReadMetricsFiltersParameter } from './types'

export type MetricDomainModel = Omit<MetricEntityModel, 'id' | 'recorded'>

const asMetricDomainModel = ({ id, recorded, ...entity }: MetricEntityModel): MetricDomainModel => entity

const asMetricEntityModel = (recorded: Timestamp) => (entity: MetricDomainModel): Omit<MetricEntityModel, 'id'> => ({
  ...entity,
  recorded
})

const writeMetrics = async (metrics: MetricDomainModel[]): Promise<ServiceResponse<MetricDomainModel[]>> => {
  try {
    const entities = await orm.writeMetrics(metrics.map(asMetricEntityModel(Date.now())))
    return ServiceResult(entities.map(asMetricDomainModel))
  } catch (error) /* istanbul ignore next */ {
    logger.error('Error Writing Metrics', error)
    return ServiceError(error)
  }
}

const readMetrics = async (
  name: string,
  bin: ReadMetricsTimeBinParameter,
  filters?: ReadMetricsFiltersParameter
): Promise<ServiceResponse<MetricDomainModel[]>> => {
  try {
    const entities = await orm.readMetrics(name, bin, filters)
    return ServiceResult(entities.map(asMetricDomainModel))
  } catch (error) /* istanbul ignore next */ {
    logger.error('Error Reading Metrics', error)
    return ServiceError(error)
  }
}

export const MetricsService = {
  startup: orm.initialize,
  writeMetrics,
  readMetrics,
  shutdown: orm.shutdown
}
