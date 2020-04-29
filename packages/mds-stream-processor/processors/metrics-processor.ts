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
import { getEnvVar, asArray } from '@mds-core/mds-utils'
import { MetricDomainModel } from '@mds-core/mds-metrics-service'
import { MetricsServiceProvider } from '@mds-core/mds-metrics-service/service/provider'
import logger from '@mds-core/mds-logger'
import { HandleServiceResponse } from '@mds-core/mds-service-helpers'
import { StreamForwarder } from './index'
import { KafkaSource } from '../connectors/kafka-connector'
import { StreamSink } from '../connectors'

export const MetricsProcessor = () => {
  const { TENANT_ID } = getEnvVar({
    TENANT_ID: 'mds'
  })

  const MetricsServiceSink = (): StreamSink<MetricDomainModel> => () => {
    return {
      initialize: async () => {
        // TODO: This won't be necessary when the service provider is a separate process
        await MetricsServiceProvider.initialize()
      },
      write: async message => {
        HandleServiceResponse(
          // TODO: Switch to MetricsServiceClient
          await MetricsServiceProvider.writeMetrics(asArray(message)),
          error => logger.error('Error processing metrics message', error),
          metrics => logger.info(`Wrote ${metrics.length} ${metrics.length === 1} ? 'metrics' : 'metric`)
        )
      },
      shutdown: async () => {
        // TODO: This won't be necessary when the service provider is a separate process
        await MetricsServiceProvider.shutdown()
      }
    }
  }

  return StreamForwarder<MetricDomainModel>(
    KafkaSource(`${TENANT_ID}.metrics`, { groupId: 'mds-metrics-processor' }),
    MetricsServiceSink()
  )
}
