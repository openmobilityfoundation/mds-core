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

import { InsertReturning, entityPropertyFilter, RepositoryError, ReadWriteRepository } from '@mds-core/mds-repository'
import { Between } from 'typeorm'
import { timeframe } from '@mds-core/mds-utils'

import { MetricEntity } from './entities'
import { ReadMetricsOptions, MetricDomainModel } from '../../@types'
import * as migrations from './migrations'
import { MetricEntityToDomain, MetricDomainToEntityCreate } from './mappers'

class MetricsReadWriteRepository extends ReadWriteRepository {
  public readMetrics = async (options: ReadMetricsOptions): Promise<MetricDomainModel[]> => {
    const { connect } = this
    try {
      const { name, time_bin_size, time_bin_start, time_bin_end, provider_id, geography_id, vehicle_type } = options
      const connection = await connect('ro')
      const entities = await connection.getRepository(MetricEntity).find({
        where: {
          name,
          time_bin_size,
          time_bin_start: Between(
            timeframe(time_bin_size, time_bin_start).start_time,
            timeframe(time_bin_size, time_bin_end ?? time_bin_start).end_time
          ),
          ...entityPropertyFilter<MetricEntity, 'provider_id'>('provider_id', provider_id),
          ...entityPropertyFilter<MetricEntity, 'geography_id'>('geography_id', geography_id),
          ...entityPropertyFilter<MetricEntity, 'vehicle_type'>('vehicle_type', vehicle_type)
        }
      })
      return entities.map(MetricEntityToDomain.mapper())
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  public writeMetrics = async (metrics: MetricDomainModel[]): Promise<MetricDomainModel[]> => {
    const { connect } = this
    try {
      const connection = await connect('rw')
      const { raw: entities }: InsertReturning<MetricEntity> = await connection
        .getRepository(MetricEntity)
        .createQueryBuilder()
        .insert()
        .values(metrics.map(MetricDomainToEntityCreate.mapper()))
        .returning('*')
        .execute()
      return entities
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  constructor() {
    super('metrics', {
      entities: [MetricEntity],
      migrations: Object.values(migrations)
    })
  }
}

export const MetricsRepository = new MetricsReadWriteRepository()
