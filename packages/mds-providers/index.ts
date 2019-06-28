import { Provider } from 'mds'

const providers: Readonly<{ [id: string]: Readonly<Provider> }> = Object.freeze({
  'c20e08cf-8488-46a6-a66c-5d8fb827f7e0': Object.freeze({
    provider_name: 'JUMP',
    url: 'https://jump.com',
    mds_api_url: 'https://api.uber.com/v0.2/emobility/mds'
  }),
  '63f13c48-34ff-49d2-aca7-cf6a5b6171c3': Object.freeze({
    provider_name: 'Lime',
    url: 'https://li.me',
    mds_api_url: 'https://data.lime.bike/api/partners/v1/mds'
  }),
  '2411d395-04f2-47c9-ab66-d09e9e3c3251': Object.freeze({
    provider_name: 'Bird',
    url: 'https://www.bird.co',
    mds_api_url: 'https://mds.bird.co'
  }),
  '6ddcc0ad-1d66-4046-bba4-d1d96bb8ca4d': Object.freeze({
    provider_name: 'Razor',
    url: 'https: //www.razor.com/share',
    mds_api_url: 'https: //razor-200806.appspot.com/api/v2/mds'
  }),
  'e714f168-ce56-4b41-81b7-0b6a4bd26128': Object.freeze({
    provider_name: 'Lyft',
    url: 'https://www.lyft.com',
    mds_api_url: 'https: //api.lyft.com/v1/last-mile/mds'
  }),
  'd73fcf80-22b1-450f-b535-042b4e30aac7': Object.freeze({
    provider_name: 'Skip',
    url: 'https://www.skipscooters.com',
    mds_api_url: 'https://api.skipscooters.com/mds'
  }),
  '2e4cb206-b475-4a9d-80fb-0880c9a033e0': Object.freeze({
    provider_name: 'HOPR',
    url: 'https://gohopr.com',
    mds_api_url: 'https://gbfs.hopr.city/api/mds'
  }),
  'b79f8687-526d-4ae6-80bf-89b4c44dc071': Object.freeze({
    provider_name: 'Wheels',
    url: 'https://wheels.co',
    mds_api_url: 'https://mds.getwheelsapp.com'
  }),
  '70aa475d-1fcd-4504-b69c-2eeb2107f7be': Object.freeze({
    provider_name: 'Spin',
    url: 'https://www.spin.app',
    mds_api_url: 'https://api.spin.pm/api/v1/mds'
  }),
  'd56d2df6-fa92-43de-ab61-92c3a84acd7d': Object.freeze({
    provider_name: 'WIND',
    url: 'https://www.wind.co',
    mds_api_url: 'https://partners.wind.co/v1/mds'
  }),
  'c8051767-4b14-4794-abc1-85aad48baff1': Object.freeze({
    provider_name: 'Test 3'
  }),
  '5f7114d1-4091-46ee-b492-e55875f7de00': Object.freeze({
    provider_name: 'Test 1'
  }),
  '45f37d69-73ca-4ca6-a461-e7283cffa01a': Object.freeze({
    provider_name: 'Test 2'
  }),
  'bf95148b-d1d1-464e-a140-6d2563ac43d4': Object.freeze({
    provider_name: 'Cloud',
    url: 'https://www.cloud.tt'
  }),
  'f3c5a65d-fd85-463e-9564-fc95ea473f7d': Object.freeze({
    provider_name: 'Blue'
  }),
  '11111111-2222-4444-8888-999999999999': Object.freeze({
    provider_name: 'Blue*'
  }),
  '3c95765d-4da6-41c6-b61e-1954472ec6c9': Object.freeze({
    provider_name: 'Sherpa'
  }),
  '3291c288-c9c8-42f1-bc3e-8502b077cd7f': Object.freeze({
    provider_name: 'Bolt',
    url: 'https://www.micromobility.com/',
    mds_api_url: 'https://bolt.miami/bolt2/api/mds'
  }),
  'daecbe87-a9f2-4a5a-b5df-8e3e14180513': Object.freeze({
    provider_name: 'CLEVR',
    url: 'https://clevrmobility.com',
    mds_api_url: 'https://portal.clevrmobility.com/api/la/'
  }),
  '264aad41-b47c-415d-8585-0208d436516e': Object.freeze({
    provider_name: 'Tier',
    url: 'https://www.tier.app',
    mds_api_url: 'https://partner.tier-services.io/mds'
  }),
  'dc3dfcf1-ed9f-4606-9c3b-ef19027846ec': Object.freeze({
    provider_name: 'Test'
  })
})

export = providers
