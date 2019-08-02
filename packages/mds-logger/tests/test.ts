/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable promise/prefer-await-to-then */
/* eslint-disable promise/always-return */
/* eslint-disable promise/no-callback-in-promise */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
    const [result] = logger.info(toCensor)
    const res = JSON.parse(result)
    test.string(res.gps.lat).contains('CENSORED')
    test.string(res.gps.lng).contains('CENSORED')
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
    logger
      .warn(toCensor)
      .then((val: any[]) => {
        const [result] = val
        const res = JSON.parse(result)
        test.string(res.gps.lat).contains('CENSORED')
        test.string(res.gps.lng).contains('CENSORED')
        done()
      })
      .catch((err: Error) => {
        done(err)
      })
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
    logger
      .error(toCensor)
      .then((vals: any[]) => {
        const [[result1, result2]] = vals
        test.string(result1.gps.lat).contains('CENSORED')
        test.string(result1.gps.lng).contains('CENSORED')
        test.string(result2.gps.lat).contains('CENSORED')
        test.string(result2.gps.lng).contains('CENSORED')
        done()
      })
      .catch(done)
  })

  it('verifies conversion of [object Object] to stringified version', done => {
    const [result] = logger.info({ key1: 'key1', key2: 'key2' })
    const res = JSON.parse(result)
    test.string(res.key1).contains('key1')
    done()
  })

  it('verifies conversion of an error', done => {
    const err = new Error('puzzling evidence')
    const [, result] = logger.info('ohai2', err)
    test.string(result).contains('evidence')
    done()
  })
})
