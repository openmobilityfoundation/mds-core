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
    const { log_data } = logger.info('some message', toCensor)
    test.string(log_data.gps.lat).is('[REDACTED]')
    test.string(log_data.gps.lng).is('[REDACTED]')
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
    const { log_data } = logger.warn('some message', toCensor)
    test.string(log_data.gps.lat).is('[REDACTED]')
    test.string(log_data.gps.lng).is('[REDACTED]')
    done()
  })

  it('censors logs of lat and lng info for mds-logger.error', done => {
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

    const { log_data } = logger.error('some message', toCensor)
    test.string(log_data.gps.lat).is('[REDACTED]')
    test.string(log_data.gps.lng).is('[REDACTED]')
    done()
  })

  it('verifies conversion of an error', done => {
    const err = new Error('puzzling evidence')
    const {
      log_message,
      log_data: { error }
    } = logger.info('ohai2', err)
    test.string(log_message).is('ohai2')
    test.string(error).contains('evidence')
    done()
  })

  it('verifies QUIET mode', () => {
    process.env.QUIET = 'false'
    const { log_data: log_data1 } = logger.log('error', 'some message', { key1: 'key1', key2: 'key2' })
    test.value(Object.keys(log_data1).length).is(2)
    process.env.QUIET = 'true'
    const result = logger.log('error', 'some message', { key1: 'key1', key2: 'key2' })
    test.value(Object.keys(result).length).is(0)
    process.env.QUIET = 'false'
  })

  it('can write a log with only a message, and no data', () => {
    logger.info('some message')
  })

  it('can write out a reasonably deep object and retain proper format', () => {
    /**
     * NOTE: This test doesn't really _test_ anything, because unfortunately we can't listen to the console output trivially.
     *       That being said, for any future engineers looking at this test...
     *       Make sure that the output in the console doesn't contain `[Object]` instead of fully qualifying :)
     */

    // With default logger depth, this will be printed out as `{ a: 'a', b: { c: 'c', d: [Object] } }`. Not ideal, we want the full object.
    const object = {
      a: 'a',
      b: {
        c: 'c',
        d: {
          e: 'e',
          f: {
            g: 'g',
            h: {
              i: 'i'
            }
          }
        }
      }
    }

    logger.log('error', 'some message', object)
  })
})
