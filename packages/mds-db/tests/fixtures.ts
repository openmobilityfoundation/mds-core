import { DISTRICT_SEVEN, GEOGRAPHY2_UUID, GEOGRAPHY_UUID, LA_CITY_BOUNDARY } from '@mds-core/mds-test-data'
import { Geography } from '@mds-core/mds-types'

export const LAGeography: Geography = {
  name: 'Los Angeles',
  geography_id: GEOGRAPHY_UUID,
  geography_json: LA_CITY_BOUNDARY
}
export const DistrictSeven: Geography = {
  name: 'District Seven',
  geography_id: GEOGRAPHY2_UUID,
  geography_json: DISTRICT_SEVEN
}
