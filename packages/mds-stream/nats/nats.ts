/*
    Copyright 2019 City of Los Angeles.

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

import nats from 'nats'
import logger from '@mds-core/mds-logger'
import { getEnvVar } from '@mds-core/mds-utils'

export type EventProcessor<TData, TResult> = (type: string, data: TData) => Promise<TResult>

const SUBSCRIPTION_TYPES = ['event', 'telemetry'] as const
type SUBSCRIPTION_TYPE = typeof SUBSCRIPTION_TYPES[number]

const subscriptionCb = async <TData, TResult>(processor: EventProcessor<TData, TResult>, msg: string) => {
  const { TENANT_ID } = getEnvVar({
    TENANT_ID: 'mds'
  })
  const TENANT_REGEXP = new RegExp(`^${TENANT_ID}\\.`)

  try {
    const {
      spec: {
        payload: { data, type }
      }
    } = JSON.parse(msg)

    const parsedData = JSON.parse(data)

    await processor(type.replace(TENANT_REGEXP, ''), parsedData)
  } catch (err) {
    logger.error(err)
  }
}

const natsSubscriber = async <TData, TResult>({
  natsClient,
  processor,
  TENANT_ID,
  type
}: {
  natsClient: nats.Client
  processor: EventProcessor<TData, TResult>
  TENANT_ID: string
  type: SUBSCRIPTION_TYPE
}) => {
  const subscriber = natsClient.subscribe(`${TENANT_ID}.${type}`, async (msg: string) => {
    return subscriptionCb(processor, msg)
  })
  return subscriber
}

const initializeNatsClient = () => {
  const { NATS = 'localhost' } = process.env
  return nats.connect(`nats://${NATS}:4222`, {
    reconnect: true,
    waitOnFirstConnect: true,
    maxReconnectAttempts: -1 // Retry forever
  })
}

export const initializeNatsSubscriber = async <TData, TResult>({
  TENANT_ID,
  processor
}: {
  TENANT_ID: string
  processor: EventProcessor<TData, TResult>
}) => {
  const natsClient = initializeNatsClient()

  try {
    natsClient.on('connect', () => {
      logger.info('Connected!')

      /* Subscribe to all available types. Down the road, this should probably be a parameter passed in to the parent function. */
      return Promise.all(
        SUBSCRIPTION_TYPES.map(type => {
          return natsSubscriber({ natsClient, processor, TENANT_ID, type })
        })
      )
    })

    natsClient.on('reconnect', () => {
      logger.info('Connected!')

      /* Subscribe to all available types. Down the road, this should probably be a parameter passed in to the parent function. */
      return Promise.all(
        SUBSCRIPTION_TYPES.map(type => {
          return natsSubscriber({ natsClient, processor, TENANT_ID, type })
        })
      )
    })

    /* istanbul ignore next */
    natsClient.on('error', async err => {
      logger.error(err)
    })
  } catch (err) {
    logger.error(err)
  }
}
