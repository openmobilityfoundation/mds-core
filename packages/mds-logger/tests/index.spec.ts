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

import * as test from 'unit.js'
import logger from '../index'

describe('MDS Logger', () => {
  it('censors logs of lat and lng info for mds-logger.info', done => {
    const toCensor = {
      device_id: 'ec551174-f324-4251-bfed-28d9f3f473fc',
      gps: {
        lat: 1231.21,
        lng: 1231.21,
        speed: 0,
        hdop: 1,
        heading: 180
      },
      charge: 0.5,
      timestamp: 1555384091559,
      recorded: 1555384091836
    }
    const [result] = logger.info(toCensor).map(arg => JSON.parse(arg))
    test.string(result.gps.lat).is('[REDACTED]')
    test.string(result.gps.lng).is('[REDACTED]')
    done()
  })

  it('censors logs of lat and lng info for mds-logger.warn', done => {
    const toCensor = {
      device_id: 'ec551174-f324-4251-bfed-28d9f3f473fc',
      gps: {
        lat: 1231.21,
        lng: 1231.21,
        speed: 0,
        hdop: 1,
        heading: 180
      },
      charge: 0.5,
      timestamp: 1555384091559,
      recorded: 1555384091836
    }
    const [result] = logger.warn(toCensor).map(arg => JSON.parse(arg))
    test.string(result.gps.lat).is('[REDACTED]')
    test.string(result.gps.lng).is('[REDACTED]')
    done()
  })

  it('censors logs of lat and lng info for mds-logger.error', done => {
    const toCensor = [
      {
        device_id: 'ec551174-f324-4251-bfed-28d9f3f473fc',
        gps: {
          lat: 1231.21,
          lng: 1231.21,
          speed: 0,
          hdop: 1,
          heading: 180
        },
        charge: 0.5,
        timestamp: 1555384091559,
        recorded: 1555384091836
      },
      {
        device_id: 'ec551174-f324-4251-bfed-28d9f3f473fc',
        gps: {
          lat: 34.21,
          lng: 341231.21,
          speed: 100,
          hdop: 10,
          heading: 20
        },
        charge: 0.75,
        timestamp: 1555384090000,
        recorded: 1555384090000
      }
    ]
    const [[result1, result2]] = logger.error(toCensor).map(arg => JSON.parse(arg))
    test.string(result1.gps.lat).is('[REDACTED]')
    test.string(result1.gps.lng).is('[REDACTED]')
    test.string(result2.gps.lat).is('[REDACTED]')
    test.string(result2.gps.lng).is('[REDACTED]')
    done()
  })

  it('verifies conversion of [object Object] to stringified version', done => {
    const [result] = logger.info({ key1: 'key1', key2: 'key2' }).map(arg => JSON.parse(arg))
    test.string(result.key1).contains('key1')
    done()
  })

  it('verifies conversion of an error', done => {
    const err = new Error('puzzling evidence')
    const [ohai2, result] = logger.info('ohai2', err).map(arg => JSON.parse(arg))
    test.string(ohai2).is('ohai2')
    test.string(result).contains('evidence')
    done()
  })

  it('verifies parameterized log INFO works', done => {
    const results = logger.log('info', { key1: 'key1', key2: 'key2' }).map(arg => JSON.parse(arg))
    test.object(results).isArray()
    test.array(results).hasLength(1)
    done()
  })

  it('verifies parameterized log WARN works', done => {
    const results = logger.log('warn', { key1: 'key1', key2: 'key2' }).map(arg => JSON.parse(arg))
    test.object(results).isArray()
    test.array(results).hasLength(1)
    done()
  })

  it('verifies parameterized log ERROR works', done => {
    const results = logger.log('error', { key1: 'key1', key2: 'key2' }).map(arg => JSON.parse(arg))
    test.object(results).isArray()
    test.array(results).hasLength(1)
    done()
  })

  it('verifies parameterized log ERROR with multiple parameters works', done => {
    const results = logger.log('error', { key1: 'key1', key2: 'key2' }, { b: 2 }).map(arg => JSON.parse(arg))
    test.object(results).isArray()
    test.array(results).hasLength(2)
    done()
  })

  it('verifies QUIET mode', () => {
    process.env.QUIET = 'false'
    const result1 = logger.log('error', { key1: 'key1', key2: 'key2' }, { b: 2 })
    test.value(result1.length).is(2)
    process.env.QUIET = 'true'
    const result2 = logger.log('error', { key1: 'key1', key2: 'key2' }, { b: 2 })
    test.value(result2.length).is(0)
  })
})
