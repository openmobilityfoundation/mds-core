const env = process.env
const log = require('loglevel')

let read_group_limit = 1024

if (env.REDIS_HOST) {
  const redis = require('redis')
  const bluebird = require('bluebird')
  bluebird.promisifyAll(redis)

  let client = null

  async function syncCache(cache) {}

  async function closeRedisClient() {
    await client.quit()
  }

  function getclient(client_name) {
    if (!client) {
      client = redis.createClient({
        host: env.REDIS_HOST || 'localhost',
        port: env.REDIS_PORT || 6379
      })
    }
    return client
  }

  async function hgetall(key) {
    return getclient().hgetallAsync(key)
  }

  async function hget(key, field) {
    return getclient().hgetAsync(key, field)
  }

  async function hset(key, field, value) {
    await getclient().hsetAsync(key, field, value)
  }

  async function hdel(key, field) {
    await getclient().hdelAsync(key, field)
  }

  async function delMatch(key) {
    let rows = await getclient().keysAsync(key)
    for (let row_index in rows) {
      await getclient().delAsync(rows[row_index])
    }
  }

  async function delCache(key) {
    await getclient().delAsync(key)
  }

  module.exports = {
    syncCache,
    closeRedisClient,
    hgetall,
    hget,
    hset,
    hdel,
    delMatch,
    delCache
  }
} else {
  let redis = {}

  async function syncCache(cache) {
    redis = cache
  }

  async function closeRedisClient() {}

  async function hgetall(client_name, key) {
    return redis[key]
  }

  async function hget(client_name, key, field) {
    if (!Object.prototype.hasOwnProperty.call(redis, key)) {
      return undefined
    }
    return redis[key][field]
  }

  async function hset(client_name, key, field, value) {
    if (!Object.prototype.hasOwnProperty.call(redis, key)) {
      redis[key] = {}
    }
    redis[key][field] = value
  }

  async function hdel(client_name, key, field) {
    delete redis[key][field]
  }

  // not currently in use, but it will probably come in handy one day
  async function delMatch(key) {
    let regex = RegExp(key)
    let matching_keys = Object.keys(redis).filter(key => {
      return regex.test(key)
    })

    for (let key_index in matching_keys) {
      delete redis[matching_keys[key_index]]
    }
  }

  async function delCache(key) {
    delete redis[key]
  }

  module.exports = {
    syncCache,
    closeRedisClient,
    hgetall,
    hget,
    hset,
    hdel,
    delMatch,
    delCache
  }
}
