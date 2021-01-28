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

import Redis, { KeyType, ValueType } from 'ioredis'
import { Nullable, Timestamp } from '@mds-core/mds-types'
import { isDefined, ClientDisconnectedError, ExceptionMessages } from '@mds-core/mds-utils'
import { initClient } from './helpers/client'
import { OrderedFields } from '../@types'

export const RedisCache = () => {
  let client: Nullable<Redis.Redis> = null

  /**
   * If the client is defined, the closure is called, otherwise throws an error
   * @param exec called with a Redis client, returns the result
   * @returns same as what the exec returns
   * @throws ClientDisconnectedError
   */
  const safelyExec = async <T>(exec: (theClient: Redis.Redis) => T) => {
    if (isDefined(client)) {
      return exec(client)
    }
    throw new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
  }

  return {
    initialize: async () => {
      if (client) {
        await client.disconnect()
      }
      client = await initClient()
    },
    shutdown: async () => {
      if (isDefined(client)) {
        client.disconnect()
      }
      client = null
    },
    multi: async () => safelyExec(theClient => theClient.multi()),

    get: async (key: KeyType) => safelyExec(theClient => theClient.get(key)),

    mget: async (keys: KeyType[]) => safelyExec(theClient => theClient.mget(keys)),

    set: async (key: KeyType, val: ValueType) => safelyExec(theClient => theClient.set(key, val)),

    expireat: async (key: KeyType, time: Timestamp) => safelyExec(theClient => theClient.expireat(key, time)),

    dbsize: async () => safelyExec(theClient => theClient.dbsize()),

    del: async (...keys: KeyType[]) => safelyExec(theClient => theClient.del(keys)),

    flushdb: async () => safelyExec(theClient => theClient.flushdb()),

    sadd: async (key: KeyType, val: ValueType) => safelyExec(theClient => theClient.sadd(key, val)),

    srem: async (key: KeyType, val: ValueType) => safelyExec(theClient => theClient.srem(key, val)),

    smembers: async (key: KeyType) => safelyExec(theClient => theClient.smembers(key)),

    lpush: async (key: KeyType, val: ValueType) => safelyExec(theClient => theClient.lpush(key, val)),

    rpush: async (key: KeyType, val: ValueType) => safelyExec(theClient => theClient.rpush(key, val)),

    lrange: async (key: KeyType, min: number, max: number) => safelyExec(theClient => theClient.lrange(key, min, max)),

    hset: async (
      key: KeyType,
      ...data: [{ [key: string]: ValueType }] | [KeyType, ValueType][] | [KeyType, ValueType]
    ) => {
      /* We need to do tons of type coercion in here due to poor typing in DefinitelyTyped... I am so sorry. */
      const isTupleArr = (d: unknown[]): d is [KeyType, ValueType][] => Array.isArray(d[0])

      const isSingleTuple = (d: unknown[]): d is [KeyType, ValueType] => typeof d[0] === 'string'

      return safelyExec(theClient => {
        if (isTupleArr(data)) {
          const args = [key, ...data.flat()] as [key: KeyType, field: string, value: ValueType]
          return theClient.hset(...args)
        }

        if (isSingleTuple(data)) {
          const args = [key, ...data] as [key: KeyType, field: string, value: ValueType]
          return theClient.hset(...args)
        }

        const [first] = data
        const args = ([key, first] as unknown) as [key: KeyType, field: string, value: ValueType]
        return theClient.hset(...args)
      })
    },
    hmset: async (key: KeyType, data: { [key: string]: ValueType }) =>
      safelyExec(theClient => theClient.hmset(key, data)),

    hdel: async (key: KeyType, ...fields: KeyType[]) => safelyExec(theClient => theClient.hdel(key, fields)),

    hgetall: async (key: KeyType) => safelyExec(theClient => theClient.hgetall(key)),

    info: async () => safelyExec(theClient => theClient.info()),

    keys: async (pattern: string) => safelyExec(theClient => theClient.keys(pattern)),

    zadd: async (key: KeyType, fields: OrderedFields | (string | number)[]) =>
      safelyExec(theClient => {
        const entries: (string | number)[] = !Array.isArray(fields)
          ? Object.entries(fields).reduce((acc: (number | string)[], [field, value]) => {
              return [...acc, value, field]
            }, [])
          : fields
        return theClient.zadd(key, ...entries)
      }),

    zrem: async (key: KeyType, val: ValueType) => safelyExec(theClient => theClient.zrem(key, val)),

    zrangebyscore: async (key: KeyType, min: string | number, max: string | number) =>
      safelyExec(theClient => theClient.zrangebyscore(key, min, max)),

    zremrangebyscore: async (key: KeyType, min: string | number, max: string | number) =>
      safelyExec(theClient => theClient.zremrangebyscore(key, min, max)),

    geoadd: async (key: KeyType, longitude: number, latitude: number, member: KeyType) =>
      safelyExec(theClient => theClient.geoadd(key, longitude, latitude, member)),

    georadius: async (key: KeyType, longitude: number, latitude: number, radius: number, unit: string) =>
      safelyExec(theClient => theClient.georadius(key, longitude, latitude, radius, unit)),

    /* TODO: Improve multi call response structure */
    multihgetall: async (key: KeyType) => safelyExec(theClient => theClient.multi().hgetall(key).exec())
  }
}
