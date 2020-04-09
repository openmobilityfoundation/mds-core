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

import test from 'unit.js'
import { v4 as uuid } from 'uuid'
import { minutes, timeframe, days } from '@mds-core/mds-utils'
import { VEHICLE_TYPE } from '@mds-core/mds-types'
import { MetricsService, MetricDomainModel } from '../index'
import { ReadMetricsTimeBinParameter, ReadMetricsFiltersParameter } from '../types'

const TEST_METRIC_NAME = 'test.metric'

function* GenerateUUID(count: number) {
  for (let p = 0; p < count; p++) {
    yield uuid()
  }
}

const time_bin_size = minutes(5)
const timestamp = Date.now() - days(1)
const { start_time, end_time } = timeframe(time_bin_size, timestamp)
const TEST_PROVIDER_IDS = [...GenerateUUID(6)]
const [provider_id1, provider_id2, provider_id3] = TEST_PROVIDER_IDS
const TEST_GEOGRAPHY_IDS = [...GenerateUUID(10)]
const [geography_id1, geography_id2, geography_id3] = TEST_GEOGRAPHY_IDS
const TEST_VEHICLE_TYPES: VEHICLE_TYPE[] = ['scooter', 'bicycle', 'moped']
const [vehicle_type1, vehicle_type2, vehicle_type3] = TEST_VEHICLE_TYPES

function* GenerateValues(maxLength: number, maxValue: number): Generator<number> {
  const length = Math.floor(Math.random() * (maxLength + 1))
  for (let i = 0; i < length; i++) {
    yield Math.floor(Math.random() * (maxValue + 1))
  }
}

type MetricDomainAggregate = Pick<MetricDomainModel, 'count' | 'sum' | 'min' | 'max' | 'avg'>

const AggregateValues = (...values: number[]): MetricDomainAggregate => {
  const count = values.length
  const sum = values.reduce((total, value) => total + value, 0)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const avg = sum / count
  return { count, sum, min, max, avg }
}

// const RollupAggregates = (metrics: MetricDomainAggregate[]): MetricDomainAggregate => {
//   const count = metrics.reduce((total, { count: value }) => total + value, 0)
//   const sum = metrics.reduce((total, { sum: value }) => total + value, 0)
//   const min = Math.min(...metrics.map(({ min: value }) => value))
//   const max = Math.max(...metrics.map(({ max: value }) => value))
//   const avg = sum / count
//   return { count, sum, min, max, avg }
// }

function* GenerateMetrics(): Generator<MetricDomainModel> {
  for (const time_bin_start of Array.from({ length: 12 }, (_, index) => start_time + time_bin_size * index)) {
    for (const provider_id of TEST_PROVIDER_IDS) {
      for (const geography_id of TEST_GEOGRAPHY_IDS) {
        for (const vehicle_type of TEST_VEHICLE_TYPES) {
          yield {
            name: TEST_METRIC_NAME,
            time_bin_size,
            time_bin_start,
            provider_id,
            geography_id,
            vehicle_type,
            ...AggregateValues(...GenerateValues(50, 100))
          }
        }
      }
    }
  }
}

const TEST_METRICS = [...GenerateMetrics()]

const testQuery = (
  query: () => {
    name: string
    bin: ReadMetricsTimeBinParameter
    filters?: ReadMetricsFiltersParameter
    expected: MetricDomainModel[]
  }
) => {
  const { name, bin, filters, expected } = query()
  return it(`Query Metrics Filters: [${
    filters
      ? `${Object.keys(filters)
          .map(key => (Array.isArray(filters[key as keyof ReadMetricsFiltersParameter]) ? `${key}[]` : key))
          .join(', ')}`
      : ''
  }] (Expect ${expected.length} Match${expected.length === 1 ? '' : 'es'})`, async () => {
    const [error, metrics] = await MetricsService.readMetrics(name, bin, filters)
    test.value(metrics).isNot(null)
    test.value(metrics?.length).is(expected.length)
    test.value(error).is(null)
  })
}

describe('Metrics Service', () => {
  before(async () => {
    await MetricsService.startup()
  })

  it(`Generate ${TEST_METRICS.length} Metric${TEST_METRICS.length === 1 ? '' : 's'}`, async () => {
    const [error, metrics] = await MetricsService.writeMetrics(TEST_METRICS)
    test.value(metrics).isNot(null)
    test.value(metrics?.length).is(TEST_METRICS.length)
    test.value(error).is(null)
  })

  testQuery(() => {
    return {
      name: TEST_METRIC_NAME,

      bin: {
        time_bin_size,
        time_bin_start: timestamp,
        time_bin_end: timestamp + days(1)
      },
      expected: TEST_METRICS.filter(
        metric =>
          metric.time_bin_size === time_bin_size &&
          metric.time_bin_start >= start_time &&
          metric.time_bin_start <= start_time + days(1)
      )
    }
  })

  testQuery(() => {
    return {
      name: TEST_METRIC_NAME,
      bin: {
        time_bin_size,
        time_bin_start: timestamp
      },
      filters: { provider_id: provider_id1 },
      expected: TEST_METRICS.filter(
        metric =>
          metric.time_bin_size === time_bin_size &&
          metric.time_bin_start >= start_time &&
          metric.time_bin_start <= end_time &&
          metric.provider_id === provider_id1
      )
    }
  })

  testQuery(() => {
    return {
      name: TEST_METRIC_NAME,
      bin: {
        time_bin_size,
        time_bin_start: timestamp
      },
      filters: { provider_id: provider_id1, geography_id: geography_id1 },
      expected: TEST_METRICS.filter(
        metric =>
          metric.time_bin_size === time_bin_size &&
          metric.time_bin_start >= start_time &&
          metric.time_bin_start <= end_time &&
          metric.provider_id === provider_id1 &&
          metric.geography_id &&
          metric.geography_id === geography_id1
      )
    }
  })

  testQuery(() => {
    return {
      name: TEST_METRIC_NAME,
      bin: {
        time_bin_size,
        time_bin_start: timestamp
      },
      filters: {
        provider_id: provider_id1,
        geography_id: geography_id1,
        vehicle_type: vehicle_type1
      },
      expected: TEST_METRICS.filter(
        metric =>
          metric.time_bin_size === time_bin_size &&
          metric.time_bin_start >= start_time &&
          metric.time_bin_start <= end_time &&
          metric.provider_id === provider_id1 &&
          metric.geography_id &&
          metric.geography_id === geography_id1 &&
          metric.vehicle_type === vehicle_type1
      )
    }
  })

  testQuery(() => {
    return {
      name: TEST_METRIC_NAME,
      bin: {
        time_bin_size,
        time_bin_start: timestamp
      },
      filters: {
        provider_id: [provider_id2, provider_id3],
        geography_id: [geography_id2, geography_id3],
        vehicle_type: [vehicle_type2, vehicle_type3]
      },
      expected: TEST_METRICS.filter(
        metric =>
          metric.time_bin_size === time_bin_size &&
          metric.time_bin_start >= start_time &&
          metric.time_bin_start <= end_time &&
          [provider_id2, provider_id3].includes(metric.provider_id) &&
          metric.geography_id &&
          [geography_id2, geography_id3].includes(metric.geography_id) &&
          [vehicle_type2, vehicle_type3].includes(metric.vehicle_type)
      )
    }
  })

  after(async () => {
    await MetricsService.shutdown()
  })
})
