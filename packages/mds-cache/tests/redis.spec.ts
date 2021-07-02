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

import { ClientDisconnectedError, ExceptionMessages, hours, minutes, now } from '@mds-core/mds-utils'
import { RedisCache } from '../redis'

const redis = RedisCache()

describe('Redis Tests', () => {
  beforeAll(async () => {
    await redis.initialize()
  })

  describe('Client Method Tests', () => {
    afterAll(async () => {
      await redis.shutdown()
    })

    afterEach(async () => {
      await redis.flushdb()
    })

    it('set()', async () => {
      const res = await redis.set('foo', 'bar')
      expect(res).toEqual('OK')
    })

    it('mset() obj', async () => {
      const testVal = 1
      const testArr = [2, 3]
      const testObj = { a: 1, b: 2, c: { foo: 'a', bar: 'b' } }
      const res = await redis.mset({
        val: JSON.stringify(testVal),
        arr: JSON.stringify(testArr),
        obj: JSON.stringify(testObj)
      })
      expect(res).toEqual('OK')
      const resVal = await redis.get('val')
      expect(JSON.parse(resVal || '')).toEqual(testVal)
      const resArr = await redis.get('arr')
      expect(JSON.parse(resArr || '')).toEqual(testArr)
      const resObj = await redis.get('obj')
      expect(JSON.parse(resObj || '')).toEqual(testObj)
    })

    it('mset() arr', async () => {
      const testVal = 1
      const testArr = [2, 3]
      const testObj = { a: 1, b: 2, c: { foo: 'a', bar: 'b' } }
      const res = await redis.mset([
        'val',
        JSON.stringify(testVal),
        'arr',
        JSON.stringify(testArr),
        'obj',
        JSON.stringify(testObj)
      ])
      expect(res).toEqual('OK')
      const resVal = await redis.get('val')
      expect(JSON.parse(resVal || '')).toEqual(testVal)
      const resArr = await redis.get('arr')
      expect(JSON.parse(resArr || '')).toEqual(testArr)
      const resObj = await redis.get('obj')
      expect(JSON.parse(resObj || '')).toEqual(testObj)
    })

    it('get()', async () => {
      await redis.set('foo', 'bar')
      const res = await redis.get('foo')
      expect(res).toEqual('bar')
    })

    it('mget()', async () => {
      await redis.set('foo', 'bar')
      await redis.set('foo1', 'bar1')
      const res = await redis.mget(['foo', 'foo1'])
      expect(res).toEqual(['bar', 'bar1'])
    })

    it('dbsize()', async () => {
      const res = await redis.dbsize()
      expect(res).toEqual(0)
    })

    it('del() single key', async () => {
      await redis.set('foo', 'bar')
      const res = await redis.del('foo')
      expect(res).toEqual(1)
    })

    it('del() multiple keys', async () => {
      await redis.set('foo', 'bar')
      await redis.set('baz', 'qux')
      const res = await redis.del('foo', 'baz')
      expect(res).toEqual(2)
    })

    describe('hset()', () => {
      it('with chained primitive keys and vals', async () => {
        await redis.hset('foo', 'bar', 'baz')
        const res = await redis.hgetall('foo')
        expect(res).toEqual({ bar: 'baz' })
      })

      it('with chained tuples', async () => {
        await redis.hset('foo', ['bar', 'baz'], ['blip', 'blap'])
        const res = await redis.hgetall('foo')
        expect(res).toEqual({ bar: 'baz', blip: 'blap' })
      })

      it('with object', async () => {
        await redis.hset('foo', { bar: 'baz' })
        const res = await redis.hgetall('foo')
        expect(res).toEqual({ bar: 'baz' })
      })
    })

    it('hdel() single field', async () => {
      await redis.hset('foo', { bar: 'baz' })
      const res = await redis.hdel('foo', 'bar')
      expect(res).toEqual(1)
    })

    it('hdel() multiple fields', async () => {
      await redis.hset('foo', 'bar', 'baz')
      await redis.hset('foo', 'bip', 'bap')
      const res = await redis.hdel('foo', 'bar', 'bip')
      expect(res).toEqual(2)
    })

    it('hgetall()', async () => {
      await redis.hset('foo', 'bar', 'baz')
      await redis.hset('foo', 'qux', 'quux')
      const res = await redis.hgetall('foo')

      expect(res).toEqual({ bar: 'baz', qux: 'quux' })
      expect(res.qux).toEqual('quux')
    })

    it('info()', async () => {
      const res = await redis.info()
      expect(typeof res).toEqual('string')
    })

    it('keys() empty db', async () => {
      const res = await redis.keys('*')
      expect(res.length).toEqual(0)
    })

    it('keys() populated db', async () => {
      await redis.set('foo', 'bar')
      const res = await redis.keys('*')
      expect(res.length).toEqual(1)
    })

    it('zadd()', async () => {
      await expect(redis.zadd('foo', { bar: 1, baz: 2 })).resolves.toEqual(2)
      await expect(redis.zadd('foo', [3, 'boot', 4, 'bat'])).resolves.toEqual(2)
    })

    it('zrangebyscore()', async () => {
      await redis.zadd('foo', { bar: 1, baz: 2 })
      await expect(redis.zrangebyscore('foo', 0, 2)).resolves.toEqual(['bar', 'baz'])
    })

    it('zremrangebyscore()', async () => {
      await redis.zadd('foo', { bar: 1, baz: 2 })
      await expect(redis.zremrangebyscore('foo', 0, 2)).resolves.toEqual(2)
    })

    it('multihgetall()', async () => {
      await redis.hset('foo', 'bar', 'baz')
      await redis.hset('foo', 'qux', 'quux')
      const res = await redis.multihgetall('foo')

      if (!res) throw new Error('Res should be defined')
      const [[, realRes]] = res
      expect(realRes).toEqual({ bar: 'baz', qux: 'quux' })
    })

    describe('Set api', () => {
      it('sadd() + smembers() + srem()', async () => {
        await redis.sadd('foo', 'bar')
        await expect(redis.smembers('foo')).resolves.toContain('bar')
        await redis.srem('foo', 'bar')
        await expect(redis.smembers('foo')).resolves.toEqual([])
      })
    })

    describe('ExpireAt', () => {
      it('expires at a time in seconds', async () => {
        await redis.set('foo', 'bar')
        // expire 1 minute from now
        await redis.expireat({ key: 'foo', timeInSeconds: Math.round(now() + minutes(1) / 1000) })
        await expect(redis.get('foo')).resolves.toEqual('bar')
        // expire 1 second ago
        await redis.expireat({ key: 'foo', timeInSeconds: Math.round(now() / 1000) - 1 })
        await expect(redis.get('foo')).resolves.toEqual(null)
      })

      it('expires at a time in milliseconds', async () => {
        await redis.set('foo', 'bar')
        // expire 1 minute from now
        await redis.expireat({ key: 'foo', timeInMs: now() + minutes(1) })
        await expect(redis.get('foo')).resolves.toEqual('bar')
        // expire 1 millisecond ago
        await redis.expireat({ key: 'foo', timeInMs: now() - 1 })
        await expect(redis.get('foo')).resolves.toEqual(null)
      })
    })
  })

  describe('Null Client tests', () => {
    beforeAll(async () => {
      await redis.shutdown()
    })

    afterAll(async () => {
      await redis.shutdown()
    })

    it('set()', async () => {
      await expect(redis.set('foo', 'bar')).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('mset()', async () => {
      await expect(redis.mset(['foo', 'bar'])).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('get()', async () => {
      await expect(redis.get('foo')).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('mget()', async () => {
      await expect(redis.mget(['foo'])).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('dbsize()', async () => {
      await expect(redis.dbsize()).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('del()', async () => {
      await expect(redis.del('foo')).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('hset()', async () => {
      await expect(redis.hset('foo', 'bar', 'baz')).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('hdel()', async () => {
      await expect(redis.hdel('foo', 'bar')).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('hgetall()', async () => {
      await expect(redis.hgetall('foo')).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('info()', async () => {
      await expect(redis.info()).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('keys()', async () => {
      await expect(redis.keys('*')).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('keys()', async () => {
      await expect(redis.keys('*')).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('zadd()', async () => {
      await expect(redis.zadd('foo', { bar: 1, baz: 2 })).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('zrangebyscore()', async () => {
      await expect(redis.zrangebyscore('foo', 0, 2)).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('multihgetall()', async () => {
      await expect(redis.multihgetall('foo')).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('sadd()', async () => {
      await expect(redis.sadd('foo', 'bar')).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('srem()', async () => {
      await expect(redis.srem('foo', 'bar')).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('smembers()', async () => {
      await expect(redis.smembers('foo')).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('expireat()', async () => {
      await expect(redis.expireat({ key: 'foo', timeInMs: now() + hours(1) })).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('lpush()', async () => {
      await expect(redis.lpush('foo', 'okay')).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('rpush()', async () => {
      await expect(redis.rpush('foo', 'okay')).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('lrange()', async () => {
      await expect(redis.lrange('foo', 0, -1)).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })

    it('zrem()', async () => {
      await expect(redis.zrem('foo', 10)).rejects.toEqual(
        new ClientDisconnectedError(ExceptionMessages.INITIALIZE_CLIENT_MESSAGE)
      )
    })
  })
})
