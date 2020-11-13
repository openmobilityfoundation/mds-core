import Redis from 'ioredis'
import { cleanEnv, host, num } from 'envalid'
import logger from '@mds-core/mds-logger'

const { REDIS_PORT, REDIS_HOST, REDIS_PASS } = cleanEnv(process.env, {
  REDIS_PORT: num({ default: 6379 }),
  REDIS_HOST: host({ default: 'localhost' })
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
    logger.warn('Redis connection established')
  })

  try {
    /*
      The ioredis client will attempt to retry establishing a connection, however the `.connect` method will throw upon the first failure...
      This wrapper attempts to connect; and if fails initially, catches it. IORedis will continue retrying in the background, so no worries.
    */
    await client.connect()
  } catch (err) {
    logger.error('Initial redis connection failure (connection will be retried):', err)
  }

  return client
}
