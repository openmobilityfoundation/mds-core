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
export const BLUE_LA_PROVIDER_ID = 'f3c5a65d-fd85-463e-9564-fc95ea473f7d'
export const BOLT_PROVIDER_ID = '3291c288-c9c8-42f1-bc3e-8502b077cd7f'
export const CLEVR_PROVIDER_ID = 'daecbe87-a9f2-4a5a-b5df-8e3e14180513'
export const SHERPA_LA_PROVIDER_ID = '3c95765d-4da6-41c6-b61e-1954472ec6c9'
export const OJO_ELECTRIC_PROVIDER_ID = '8d293326-8464-4256-8312-617ebcd0efad'
export const CIRC_PROVIDER_ID = '03d5d605-e5c9-45a1-a1dd-144aa8649525'

// Additional provider IDs in use (should be registered)
export const LADOT_PROVIDER_ID = '33bbcec3-f91b-4461-bc41-61711afb9460'
export const BLUE_SYSTEMS_PROVIDER_ID = '5674ea42-a2ab-42e0-b9fd-cbade6cb2561'
export const TEST1_PROVIDER_ID = '5f7114d1-4091-46ee-b492-e55875f7de00'
export const TEST2_PROVIDER_ID = '45f37d69-73ca-4ca6-a461-e7283cffa01a'
export const LA_YELLOW_CAB_PROVIDER_ID = '286b317e-3c6c-498e-8920-94f7bd1bb3e7'

// Mocha testing PROVIDER_ID value
export const MOCHA_PROVIDER_ID = 'c8051767-4b14-4794-abc1-85aad48baff1'

// Support PROVIDER_ID values (Reserved for support use)
export const SUPPORT1_PROVIDER_ID = '09828cf3-9b85-449b-bc8f-d3aaef5c3448'
export const SUPPORT2_PROVIDER_ID = 'fa5f6ce0-c038-4027-9c2c-a693f1ed7533'
export const SUPPORT3_PROVIDER_ID = '9944b4cd-58a3-4969-a6d4-c131ff0b2111'

const PROVIDER_IDS = [
  JUMP_PROVIDER_ID,
  LIME_PROVIDER_ID,
  BIRD_PROVIDER_ID,
  RAZOR_PROVIDER_ID,
  CIRC_PROVIDER_ID,
  LYFT_PROVIDER_ID,
  SKIP_PROVIDER_ID,
  HOPR_PROVIDER_ID,
  WHEELS_PROVIDER_ID,
  SPIN_PROVIDER_ID,
  WIND_PROVIDER_ID,
  TIER_PROVIDER_ID,
  CLOUD_PROVIDER_ID,
  BLUE_LA_PROVIDER_ID,
  BOLT_PROVIDER_ID,
  CLEVR_PROVIDER_ID,
  SHERPA_LA_PROVIDER_ID,
  OJO_ELECTRIC_PROVIDER_ID,
  BLUE_SYSTEMS_PROVIDER_ID,
  LADOT_PROVIDER_ID,
  TEST1_PROVIDER_ID,
  TEST2_PROVIDER_ID,
  LA_YELLOW_CAB_PROVIDER_ID,
  MOCHA_PROVIDER_ID,
  SUPPORT1_PROVIDER_ID,
  SUPPORT2_PROVIDER_ID,
  SUPPORT3_PROVIDER_ID
] as const

export type PROVIDER_ID = typeof PROVIDER_IDS[number]

export const providers: Readonly<{ [P in PROVIDER_ID]: Readonly<Provider> }> = Object.freeze({
  [JUMP_PROVIDER_ID]: Object.freeze({
    provider_id: JUMP_PROVIDER_ID,
    provider_name: 'JUMP',
    url: 'https://jump.com',
    mds_api_url: 'https://api.uber.com/v0.2/emobility/mds'
  }),
  [LIME_PROVIDER_ID]: Object.freeze({
    provider_id: LIME_PROVIDER_ID,
    provider_name: 'Lime',
    url: 'https://li.me',
    mds_api_url: 'https://data.lime.bike/api/partners/v1/mds'
  }),
  [BIRD_PROVIDER_ID]: Object.freeze({
    provider_id: BIRD_PROVIDER_ID,
    provider_name: 'Bird',
    url: 'https://www.bird.co',
    mds_api_url: 'https://mds.bird.co',
    gbfs_api_url: 'https://mds.bird.co/gbfs'
  }),
  [CIRC_PROVIDER_ID]: Object.freeze({
    provider_id: CIRC_PROVIDER_ID,
    provider_name: 'Circ',
    url: 'https://www.circ.com',
    mds_api_url: 'https://mds.bird.co'
  }),
  [RAZOR_PROVIDER_ID]: Object.freeze({
    provider_id: RAZOR_PROVIDER_ID,
    provider_name: 'Razor',
    url: 'https: //www.razor.com/share',
    mds_api_url: 'https: //razor-200806.appspot.com/api/v2/mds'
  }),
  [LYFT_PROVIDER_ID]: Object.freeze({
    provider_id: LYFT_PROVIDER_ID,
    provider_name: 'Lyft',
    url: 'https://www.lyft.com',
    mds_api_url: 'https: //api.lyft.com/v1/last-mile/mds'
  }),
  [SKIP_PROVIDER_ID]: Object.freeze({
    provider_id: SKIP_PROVIDER_ID,
    provider_name: 'Skip',
    url: 'https://www.skipscooters.com',
    mds_api_url: 'https://api.skipscooters.com/mds'
  }),
  [HOPR_PROVIDER_ID]: Object.freeze({
    provider_id: HOPR_PROVIDER_ID,
    provider_name: 'HOPR',
    url: 'https://gohopr.com',
    mds_api_url: 'https://gbfs.hopr.city/api/mds'
  }),
  [WHEELS_PROVIDER_ID]: Object.freeze({
    provider_id: WHEELS_PROVIDER_ID,
    provider_name: 'Wheels',
    url: 'https://wheels.co',
    mds_api_url: 'https://mds.getwheelsapp.com'
  }),
  [SPIN_PROVIDER_ID]: Object.freeze({
    provider_id: SPIN_PROVIDER_ID,
    provider_name: 'Spin',
    url: 'https://www.spin.app',
    mds_api_url: 'https://api.spin.pm/api/v1/mds'
  }),
  [WIND_PROVIDER_ID]: Object.freeze({
    provider_id: WIND_PROVIDER_ID,
    provider_name: 'WIND',
    url: 'https://www.wind.co',
    mds_api_url: 'https://partners.wind.co/v1/mds'
  }),
  [TIER_PROVIDER_ID]: Object.freeze({
    provider_id: TIER_PROVIDER_ID,
    provider_name: 'Tier',
    url: 'https://www.tier.app',
    mds_api_url: 'https://partner.tier-services.io/mds'
  }),
  [CLOUD_PROVIDER_ID]: Object.freeze({
    provider_id: CLOUD_PROVIDER_ID,
    provider_name: 'Cloud',
    url: 'https://www.cloud.tt',
    mds_api_url: 'https://mds.cloud.tt',
    gbfs_api_url: 'https://mds.cloud.tt/gbfs'
  }),
  [BLUE_LA_PROVIDER_ID]: Object.freeze({
    provider_id: BLUE_LA_PROVIDER_ID,
    provider_name: 'BlueLA',
    url: 'https://www.bluela.com',
    mds_api_url: 'https://api.bluela.com/mds/v0',
    gbfs_api_url: 'https://api.bluela.com/gbfs/v1/meta'
  }),
  [BOLT_PROVIDER_ID]: Object.freeze({
    provider_id: BOLT_PROVIDER_ID,
    provider_name: 'Bolt',
    url: 'https://www.micromobility.com/',
    mds_api_url: 'https://bolt.miami/bolt2/api/mds'
  }),
  [CLEVR_PROVIDER_ID]: Object.freeze({
    provider_id: CLEVR_PROVIDER_ID,
    provider_name: 'CLEVR',
    url: 'https://clevrmobility.com',
    mds_api_url: 'https://portal.clevrmobility.com/api/la/',
    gbfs_api_url: 'https://portal.clevrmobility.com/api/gbfs/en/discovery/'
  }),
  [SHERPA_LA_PROVIDER_ID]: Object.freeze({
    provider_id: SHERPA_LA_PROVIDER_ID,
    provider_name: 'SherpaLA',
    mds_api_url: 'https://mds.bird.co',
    gbfs_api_url: 'https://mds.bird.co/gbfs/platform-partner/sherpa-la'
  }),
  [OJO_ELECTRIC_PROVIDER_ID]: Object.freeze({
    provider_id: OJO_ELECTRIC_PROVIDER_ID,
    provider_name: 'OjO Electric',
    url: 'https://www.ojoelectric.com',
    mds_api_url: 'https://api.ojoelectric.com/api/mds',
    gbfs_api_url: 'https://api.ojoelectric.com/api/mds/gbfs.json'
  }),
  [LADOT_PROVIDER_ID]: Object.freeze({
    provider_id: LADOT_PROVIDER_ID,
    provider_name: 'LADOT',
    url: 'https://ladot.io'
  }),
  [BLUE_SYSTEMS_PROVIDER_ID]: Object.freeze({
    provider_id: BLUE_SYSTEMS_PROVIDER_ID,
    provider_name: 'Blue Systems',
    url: 'https://www.bluesystems.ai'
  }),
  [TEST1_PROVIDER_ID]: Object.freeze({
    provider_id: TEST1_PROVIDER_ID,
    provider_name: 'Test 1'
  }),
  [TEST2_PROVIDER_ID]: Object.freeze({
    provider_id: TEST2_PROVIDER_ID,
    provider_name: 'Test 2'
  }),
  [LA_YELLOW_CAB_PROVIDER_ID]: Object.freeze({
    provider_id: LA_YELLOW_CAB_PROVIDER_ID,
    provider_name: 'LA Yellow Cab'
  }),
  [MOCHA_PROVIDER_ID]: Object.freeze({
    provider_id: MOCHA_PROVIDER_ID,
    provider_name: 'Mocha Test Provider'
  }),
  [SUPPORT1_PROVIDER_ID]: Object.freeze({
    provider_id: SUPPORT1_PROVIDER_ID,
    provider_name: 'Support 1'
  }),
  [SUPPORT2_PROVIDER_ID]: Object.freeze({
    provider_id: SUPPORT2_PROVIDER_ID,
    provider_name: 'Support 2'
  }),
  [SUPPORT3_PROVIDER_ID]: Object.freeze({
    provider_id: SUPPORT3_PROVIDER_ID,
    provider_name: 'Support 3'
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
  return isProviderId(provider_id) ? providers[provider_id].provider_name : provider_id
}
