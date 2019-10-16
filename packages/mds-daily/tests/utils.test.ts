import assert from 'assert'
import cache from '@mds-core/mds-cache'
import Sinon from 'sinon'
import { categorizeTrips, TripsData, asInt, getMaps } from '../utils'

describe('MDS Daily utils', () => {
  describe('asInt()', () => {
    it('Converts string to number', () => {
      assert.equal(asInt('15'), 15)
    })

    it('Leaves number intact', () => {
      assert.equal(asInt(15), 15)
    })

    it('Handles undefined correctly', () => {
      assert.strictEqual(asInt(undefined), undefined)
    })
  })

  describe('categorizeTrips()', () => {
    it('Categorizes "sparse" trips data', () => {
      const tripsData: TripsData = {}
      const result = categorizeTrips(tripsData)
      const expected = {}
      assert.deepStrictEqual(result, expected)
    })

    it('Categorizes trips data', () => {
      const tripsData: TripsData = {
        'fake-trip-index': {
          provider_id: 'fake-provider-id',
          trip_id: 'fake-trip-id',
          eventTypes: {
            1: 'fake-event-data',
            10: 'fake-other-event-data'
          }
        }
      }
      const result = categorizeTrips(tripsData)
      const expected = {
        'fake-provider-id': {
          mysteries: {
            'fake-event-data-fake-other-event-data': 1
          },
          mystery: 1,
          mystery_examples: {
            'fake-event-data-fake-other-event-data': ['fake-trip-index']
          }
        }
      }
      assert.deepStrictEqual(result, expected)
    })
  })

  it('Computes event mapping correctly even with cache miss', async () => {
    Sinon.replace(cache, 'readAllEvents', Sinon.fake.resolves([null]))
    const maps = await getMaps()
    assert.deepStrictEqual(maps, { eventMap: {} })
  })
})
