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
    test.string(result.gps.lat).contains('CENSORED')
    test.string(result.gps.lng).contains('CENSORED')
    done()
  })

  it('censors logs of lat and lng info for mds-logger.warn', async done => {
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
    const val = await logger.warn(toCensor)
    const [result] = val
    test.string(result.gps.lat).contains('CENSORED')
    test.string(result.gps.lng).contains('CENSORED')
    done()
  })

  it('censors logs of lat and lng info for mds-logger.error', async done => {
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
    const val = await logger.error(toCensor)
    const [[result1, result2]] = val
    test.string(result1.gps.lat).contains('CENSORED')
    test.string(result1.gps.lng).contains('CENSORED')
    test.string(result2.gps.lat).contains('CENSORED')
    test.string(result2.gps.lng).contains('CENSORED')
    done()
  })

  it('verifies conversion of [object Object] to stringified version', done => {
    const [result] = logger.info({ key1: 'key1', key2: 'key2' })
    test.string(result.key1).contains('key1')
    done()
  })

  it('verifies conversion of an error', done => {
    const err = new Error('puzzling evidence')
    const [, result] = logger.info('ohai2', err)
    test.string(result).contains('evidence')
    done()
  })
})
