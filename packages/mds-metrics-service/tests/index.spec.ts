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
import { uuid, minutes, timeframe, days, pluralize } from '@mds-core/mds-utils'
import { VEHICLE_TYPE } from '@mds-core/mds-types'
import { HandleServiceResponse } from '@mds-core/mds-service-helpers'
import { MetricsServiceProvider } from '../service/provider'
import { MetricDomainModel, ReadMetricsOptions, ReadMetricsFilterOptions } from '../@types'

// Test Constants
const TEST_METRIC_NAME = 'test.metric'
const TEST_TIME_BIN_SIZE = minutes(5)
const TEST_TIMESTAMP = Date.now() - days(1)
const { start_time: TEST_TIME_BIN_START, end_time: TEST_TIME_BIN_END } = timeframe(TEST_TIME_BIN_SIZE, TEST_TIMESTAMP)
const TEST_PROVIDER_IDS = Array.from({ length: 6 }, () => uuid())
const [TEST_PROVIDER_ID1, TEST_PROVIDER_ID2, TEST_PROVIDER_ID3] = TEST_PROVIDER_IDS
const TEST_GEOGRAPHY_IDS = Array.from({ length: 10 }, () => uuid())
const [TEST_GEOGRAPHY_ID1, TEST_GEOGRAPHY_ID2, TEST_GEOGRAPHY_ID3] = TEST_GEOGRAPHY_IDS
const TEST_VEHICLE_TYPES: VEHICLE_TYPE[] = ['scooter', 'bicycle', 'moped']
const [TEST_VEHICLE_TYPE1, TEST_VEHICLE_TYPE2, TEST_VEHICLE_TYPE3] = TEST_VEHICLE_TYPES

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
  for (const time_bin_start of Array.from(
    { length: 12 },
    (_, index) => TEST_TIME_BIN_START + TEST_TIME_BIN_SIZE * index
  )) {
    for (const provider_id of TEST_PROVIDER_IDS) {
      for (const geography_id of TEST_GEOGRAPHY_IDS) {
        for (const vehicle_type of TEST_VEHICLE_TYPES) {
          yield {
            name: TEST_METRIC_NAME,
            time_bin_size: TEST_TIME_BIN_SIZE,
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

const testQuery = (query: () => ReadMetricsOptions & { expected: MetricDomainModel[] }) => {
  const { expected, ...options } = query()
  const { name, time_bin_size, time_bin_start, time_bin_end, ...filters } = options
  return it(`Query Metrics Filters: [${
    filters
      ? `${Object.keys(filters)
          .map(key => (Array.isArray(filters[key as keyof ReadMetricsFilterOptions]) ? `${key}[]` : key))
          .join(', ')}`
      : ''
  }] (Expect ${expected.length} ${pluralize(expected.length, 'Match', 'Matches')})`, async () =>
    HandleServiceResponse(
      await MetricsServiceProvider.readMetrics(options),
      error => test.value(error).is(null),
      metrics => test.value(metrics.length).is(expected.length)
    ))
}

describe('Metrics Service', () => {
  before(async () => {
    await MetricsServiceProvider.initialize()
  })

  it(`Generate ${TEST_METRICS.length} ${pluralize(TEST_METRICS.length, 'Metric', 'Metrics')}`, async () =>
    HandleServiceResponse(
      await MetricsServiceProvider.writeMetrics(TEST_METRICS),
      error => test.value(error).is(null),
      metrics => test.value(metrics.length).is(TEST_METRICS.length)
    ))

  testQuery(() => ({
    name: TEST_METRIC_NAME,
    time_bin_size: TEST_TIME_BIN_SIZE,
    time_bin_start: TEST_TIMESTAMP,
    time_bin_end: TEST_TIMESTAMP + days(1),
    expected: TEST_METRICS.filter(
      metric =>
        metric.time_bin_size === TEST_TIME_BIN_SIZE &&
        metric.time_bin_start >= TEST_TIME_BIN_START &&
        metric.time_bin_start <= TEST_TIME_BIN_START + days(1)
    )
  }))

  testQuery(() => ({
    name: TEST_METRIC_NAME,
    time_bin_size: TEST_TIME_BIN_SIZE,
    time_bin_start: TEST_TIMESTAMP,
    provider_id: TEST_PROVIDER_ID1,
    expected: TEST_METRICS.filter(
      metric =>
        metric.time_bin_size === TEST_TIME_BIN_SIZE &&
        metric.time_bin_start >= TEST_TIME_BIN_START &&
        metric.time_bin_start <= TEST_TIME_BIN_END &&
        metric.provider_id === TEST_PROVIDER_ID1
    )
  }))

  testQuery(() => ({
    name: TEST_METRIC_NAME,
    time_bin_size: TEST_TIME_BIN_SIZE,
    time_bin_start: TEST_TIMESTAMP,
    provider_id: TEST_PROVIDER_ID1,
    geography_id: TEST_GEOGRAPHY_ID1,
    expected: TEST_METRICS.filter(
      metric =>
        metric.time_bin_size === TEST_TIME_BIN_SIZE &&
        metric.time_bin_start >= TEST_TIME_BIN_START &&
        metric.time_bin_start <= TEST_TIME_BIN_END &&
        metric.provider_id === TEST_PROVIDER_ID1 &&
        metric.geography_id &&
        metric.geography_id === TEST_GEOGRAPHY_ID1
    )
  }))

  testQuery(() => ({
    name: TEST_METRIC_NAME,
    time_bin_size: TEST_TIME_BIN_SIZE,
    time_bin_start: TEST_TIMESTAMP,
    provider_id: TEST_PROVIDER_ID1,
    geography_id: TEST_GEOGRAPHY_ID1,
    vehicle_type: TEST_VEHICLE_TYPE1,
    expected: TEST_METRICS.filter(
      metric =>
        metric.time_bin_size === TEST_TIME_BIN_SIZE &&
        metric.time_bin_start >= TEST_TIME_BIN_START &&
        metric.time_bin_start <= TEST_TIME_BIN_END &&
        metric.provider_id === TEST_PROVIDER_ID1 &&
        metric.geography_id &&
        metric.geography_id === TEST_GEOGRAPHY_ID1 &&
        metric.vehicle_type === TEST_VEHICLE_TYPE1
    )
  }))

  testQuery(() => ({
    name: TEST_METRIC_NAME,
    time_bin_size: TEST_TIME_BIN_SIZE,
    time_bin_start: TEST_TIMESTAMP,
    provider_id: [TEST_PROVIDER_ID2, TEST_PROVIDER_ID3],
    geography_id: [TEST_GEOGRAPHY_ID2, TEST_GEOGRAPHY_ID3],
    vehicle_type: [TEST_VEHICLE_TYPE2, TEST_VEHICLE_TYPE3],
    expected: TEST_METRICS.filter(
      metric =>
        metric.time_bin_size === TEST_TIME_BIN_SIZE &&
        metric.time_bin_start >= TEST_TIME_BIN_START &&
        metric.time_bin_start <= TEST_TIME_BIN_END &&
        metric.provider_id &&
        [TEST_PROVIDER_ID2, TEST_PROVIDER_ID3].includes(metric.provider_id) &&
        metric.geography_id &&
        [TEST_GEOGRAPHY_ID2, TEST_GEOGRAPHY_ID3].includes(metric.geography_id) &&
        metric.vehicle_type &&
        [TEST_VEHICLE_TYPE2, TEST_VEHICLE_TYPE3].includes(metric.vehicle_type)
    )
  }))

  after(async () => {
    await MetricsServiceProvider.shutdown()
  })
})
