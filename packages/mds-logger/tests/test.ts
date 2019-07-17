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
    logger
      .info(toCensor)
      .then(val => {
        const [result] = val
        test.string(result.gps.lat).contains('CENSORED')
        test.string(result.gps.lng).contains('CENSORED')
        done()
      })
      .catch(err => {
        done(err)
      })
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
      .then(val => {
        const [result] = val
        test.string(result.gps.lat).contains('CENSORED')
        test.string(result.gps.lng).contains('CENSORED')
        done()
      })
      .catch(err => {
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
      .then(val => {
        const [[result1, result2]] = val
        test.string(result1.gps.lat).contains('CENSORED')
        test.string(result1.gps.lng).contains('CENSORED')
        test.string(result2.gps.lat).contains('CENSORED')
        test.string(result2.gps.lng).contains('CENSORED')
        done()
      })
      .catch(done)
  })

  it('verifies conversion of [object Object] to stringified version', done => {
    logger
      .info({ key1: 'key1', key2: 'key2' })
      .then(val => {
        const [result] = val
        test.string(result.key1).contains('key1')
        done()
      })
      .catch(done)
  })

  it('verifies conversion of an error', done => {
    const err = new Error('puzzling evidence')
    logger
      .info('ohai2', err)
      .then(val => {
        const [, result2] = val
        test.string(result2).contains('evidence')
        done()
      })
      .catch(done)
  })
})
