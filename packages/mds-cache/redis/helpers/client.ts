/**
 * Copyright 2019 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Redis from 'ioredis'
import { cleanEnv, host, num, str } from 'envalid'
import logger from '@mds-core/mds-logger'

const { REDIS_PORT, REDIS_HOST, REDIS_PASS } = cleanEnv(process.env, {
  REDIS_PORT: num({ default: 6379 }),
  REDIS_HOST: host({ default: 'localhost' }),
  REDIS_PASS: str({ default: '' })
})

export const initClient = async () => {
  const client = new Redis({
    lazyConnect: true,
    maxRetriesPerRequest: 1000, // 20 is default, but that may not be long enough (thanks istio)
    port: REDIS_PORT,
    host: REDIS_HOST,
    password: REDIS_PASS
  })

  client.on('connect', () => {
    logger.info(`Redis connection established to ${REDIS_HOST}:${REDIS_PORT}`)
  })

  try {
    /*
      The ioredis client will attempt to retry establishing a connection, however the `.connect` method will throw upon the first failure...
      This wrapper attempts to connect; and if fails initially, catches it. IORedis will continue retrying in the background, so no worries.
    */
    await client.connect()
  } catch (err) {
    logger.error(`Initial redis connection to ${REDIS_HOST}:${REDIS_PORT} failed (connection will be retried)`, err)
  }

  return client
}
