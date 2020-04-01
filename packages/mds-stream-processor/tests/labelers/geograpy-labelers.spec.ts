import { GeographyLabeler } from '@mds-core/mds-stream-processor/labelers/geography-labeler'
import * as utils from '@mds-core/mds-utils'
import db from '@mds-core/mds-db'
import Sinon from 'sinon'
import { Geography } from '@mds-core/mds-types'
import { v4 as uuid } from 'uuid'
import assert from 'assert'

const mockGeographies: Geography[] = Array.from({ length: 100 }, () => ({
  geography_id: uuid(),
  geography_json: {
    type: 'FeatureCollection',
    features: []
  },
  name: uuid() // Usually intended to be a human readable name, but we just need a random string here.
}))

const mockTelemetry = {
  provider_id: uuid(),
  device_id: uuid(),
  timestamp: utils.now(),
  gps: { lat: 34.0522, lng: 118.2437 }
}

describe('GeographyLabeler tests', async () => {
  it('Tests all matched geographies are included in list', async () => {
    Sinon.replace(utils, 'pointInShape', () => true)
    Sinon.replace(db, 'readGeographies', async () => mockGeographies)

    const { geography_ids } = await GeographyLabeler()({ telemetry: mockTelemetry })

    geography_ids.forEach(geography_id =>
      assert(mockGeographies.find(geography => geography.geography_id === geography_id))
    )
  })

  it('Tests that absent gps in telemetry elicits no matches', async () => {
    const { geography_ids } = await GeographyLabeler()({})
    assert(geography_ids.length === [].length)
  })
})
