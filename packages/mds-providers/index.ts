import { Provider } from '@mds-core/mds-types'

// Officially recognized providers, from:
// https://github.com/CityOfLosAngeles/mobility-data-specification/blob/dev/providers.csv
export const JUMP_PROVIDER_ID = 'c20e08cf-8488-46a6-a66c-5d8fb827f7e0'
export const LIME_PROVIDER_ID = '63f13c48-34ff-49d2-aca7-cf6a5b6171c3'
export const BIRD_PROVIDER_ID = '2411d395-04f2-47c9-ab66-d09e9e3c3251'
export const RAZOR_PROVIDER_ID = '6ddcc0ad-1d66-4046-bba4-d1d96bb8ca4d'
export const LYFT_PROVIDER_ID = 'e714f168-ce56-4b41-81b7-0b6a4bd26128'
export const SKIP_PROVIDER_ID = 'd73fcf80-22b1-450f-b535-042b4e30aac7'
export const HOPR_PROVIDER_ID = '2e4cb206-b475-4a9d-80fb-0880c9a033e0'
export const WHEELS_PROVIDER_ID = 'b79f8687-526d-4ae6-80bf-89b4c44dc071'
export const SPIN_PROVIDER_ID = '70aa475d-1fcd-4504-b69c-2eeb2107f7be'
export const WIND_PROVIDER_ID = 'd56d2df6-fa92-43de-ab61-92c3a84acd7d'
export const TIER_PROVIDER_ID = '264aad41-b47c-415d-8585-0208d436516e'
export const CLOUD_PROVIDER_ID = 'bf95148b-d1d1-464e-a140-6d2563ac43d4'
export const BLUE_PROVIDER_ID = 'f3c5a65d-fd85-463e-9564-fc95ea473f7d'
export const BOLT_PROVIDER_ID = '3291c288-c9c8-42f1-bc3e-8502b077cd7f'
export const CLEVR_PROVIDER_ID = 'daecbe87-a9f2-4a5a-b5df-8e3e14180513'
export const SHERPA_PROVIDER_ID = '3c95765d-4da6-41c6-b61e-1954472ec6c9'
export const OJO_PROVIDER_ID = '8d293326-8464-4256-8312-617ebcd0efad'

// PROVIDER_ID values for testing
export const TEST1_PROVIDER_ID = '5f7114d1-4091-46ee-b492-e55875f7de00'
export const TEST2_PROVIDER_ID = '45f37d69-73ca-4ca6-a461-e7283cffa01a'
export const TEST3_PROVIDER_ID = 'c8051767-4b14-4794-abc1-85aad48baff1'
export const TEST4_PROVIDER_ID = '11111111-2222-4444-8888-999999999999'

const PROVIDER_IDS = [
  JUMP_PROVIDER_ID,
  LIME_PROVIDER_ID,
  BIRD_PROVIDER_ID,
  RAZOR_PROVIDER_ID,
  LYFT_PROVIDER_ID,
  SKIP_PROVIDER_ID,
  HOPR_PROVIDER_ID,
  WHEELS_PROVIDER_ID,
  SPIN_PROVIDER_ID,
  WIND_PROVIDER_ID,
  TIER_PROVIDER_ID,
  CLOUD_PROVIDER_ID,
  BLUE_PROVIDER_ID,
  BOLT_PROVIDER_ID,
  CLEVR_PROVIDER_ID,
  SHERPA_PROVIDER_ID,
  OJO_PROVIDER_ID,
  TEST1_PROVIDER_ID,
  TEST2_PROVIDER_ID,
  TEST3_PROVIDER_ID,
  TEST4_PROVIDER_ID
] as const

type PROVIDER_ID = typeof PROVIDER_IDS[number]

export const providers: Readonly<{ [P in PROVIDER_ID]: Readonly<Provider> }> = Object.freeze({
  [JUMP_PROVIDER_ID]: Object.freeze({
    provider_name: 'JUMP',
    url: 'https://jump.com',
    mds_api_url: 'https://api.uber.com/v0.2/emobility/mds'
  }),
  [LIME_PROVIDER_ID]: Object.freeze({
    provider_name: 'Lime',
    url: 'https://li.me',
    mds_api_url: 'https://data.lime.bike/api/partners/v1/mds'
  }),
  [BIRD_PROVIDER_ID]: Object.freeze({
    provider_name: 'Bird',
    url: 'https://www.bird.co',
    mds_api_url: 'https://mds.bird.co',
    gbfs_api_url: 'https://mds.bird.co/gbfs'
  }),
  [RAZOR_PROVIDER_ID]: Object.freeze({
    provider_name: 'Razor',
    url: 'https: //www.razor.com/share',
    mds_api_url: 'https: //razor-200806.appspot.com/api/v2/mds'
  }),
  [LYFT_PROVIDER_ID]: Object.freeze({
    provider_name: 'Lyft',
    url: 'https://www.lyft.com',
    mds_api_url: 'https: //api.lyft.com/v1/last-mile/mds'
  }),
  [SKIP_PROVIDER_ID]: Object.freeze({
    provider_name: 'Skip',
    url: 'https://www.skipscooters.com',
    mds_api_url: 'https://api.skipscooters.com/mds'
  }),
  [HOPR_PROVIDER_ID]: Object.freeze({
    provider_name: 'HOPR',
    url: 'https://gohopr.com',
    mds_api_url: 'https://gbfs.hopr.city/api/mds'
  }),
  [WHEELS_PROVIDER_ID]: Object.freeze({
    provider_name: 'Wheels',
    url: 'https://wheels.co',
    mds_api_url: 'https://mds.getwheelsapp.com'
  }),
  [SPIN_PROVIDER_ID]: Object.freeze({
    provider_name: 'Spin',
    url: 'https://www.spin.app',
    mds_api_url: 'https://api.spin.pm/api/v1/mds'
  }),
  [WIND_PROVIDER_ID]: Object.freeze({
    provider_name: 'WIND',
    url: 'https://www.wind.co',
    mds_api_url: 'https://partners.wind.co/v1/mds'
  }),
  [TIER_PROVIDER_ID]: Object.freeze({
    provider_name: 'Tier',
    url: 'https://www.tier.app',
    mds_api_url: 'https://partner.tier-services.io/mds'
  }),
  [CLOUD_PROVIDER_ID]: Object.freeze({
    provider_name: 'Cloud',
    url: 'https://www.cloud.tt',
    mds_api_url: 'https://mds.cloud.tt',
    gbfs_api_url: 'https://mds.cloud.tt/gbfs'
  }),
  [BLUE_PROVIDER_ID]: Object.freeze({
    provider_name: 'Blue',
    url: 'https://www.bluela.com',
    mds_api_url: 'https://api.bluela.com/mds/v0',
    gbfs_api_url: 'https://api.bluela.com/gbfs/v1/meta'
  }),
  [BOLT_PROVIDER_ID]: Object.freeze({
    provider_name: 'Bolt',
    url: 'https://www.micromobility.com/',
    mds_api_url: 'https://bolt.miami/bolt2/api/mds'
  }),
  [CLEVR_PROVIDER_ID]: Object.freeze({
    provider_name: 'CLEVR',
    url: 'https://clevrmobility.com',
    mds_api_url: 'https://portal.clevrmobility.com/api/la/',
    gbfs_api_url: 'https://portal.clevrmobility.com/api/gbfs/en/discovery/'
  }),
  [SHERPA_PROVIDER_ID]: Object.freeze({
    provider_name: 'Sherpa',
    mds_api_url: 'https://mds.bird.co',
    gbfs_api_url: 'https://mds.bird.co/gbfs/platform-partner/sherpa-la'
  }),
  [OJO_PROVIDER_ID]: Object.freeze({
    provider_name: 'OjO Electric',
    url: 'https://www.ojoelectric.com',
    mds_api_url: 'https://api.ojoelectric.com/api/mds',
    gbfs_api_url: 'https://api.ojoelectric.com/api/mds/gbfs.json'
  }),
  [TEST1_PROVIDER_ID]: Object.freeze({
    provider_name: 'Test 1'
  }),
  [TEST2_PROVIDER_ID]: Object.freeze({
    provider_name: 'Test 2'
  }),
  [TEST3_PROVIDER_ID]: Object.freeze({
    provider_name: 'Test 3'
  }),
  [TEST4_PROVIDER_ID]: Object.freeze({
    provider_name: 'Blue*'
  })
})

export function isProviderId(provider_id: unknown): provider_id is PROVIDER_ID {
  return typeof provider_id === 'string' && providers[provider_id as PROVIDER_ID] !== undefined
}

/**
 * convert provider_id to provider name (if available), or a subset of the UUID for humans
 * @param  provider_id
 * @return name or provider_id substring
 */
export function providerName(provider_id: string): string {
  return isProviderId(provider_id) ? providers[provider_id].provider_name : provider_id.split('-')[0]
}
