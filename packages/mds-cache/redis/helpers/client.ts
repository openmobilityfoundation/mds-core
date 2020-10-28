import Redis from 'ioredis'
import { cleanEnv, host, num } from 'envalid'

const { REDIS_PORT, REDIS_HOST, REDIS_PASS } = cleanEnv(process.env, {
  REDIS_PORT: num({ default: 6379 }),
  REDIS_HOST: host({ default: 'localhost' })
})

export const initClient = async () => {
  const client = new Redis({ lazyConnect: true, port: REDIS_PORT, host: REDIS_HOST, password: REDIS_PASS })

  await client.connect()

  return client
}
