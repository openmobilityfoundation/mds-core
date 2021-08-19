import { GeographyService } from '@mds-core/mds-geography-service'
import { ServiceClient } from '@mds-core/mds-service-helpers'
import VENICE from '@mds-core/mds-test-data/test-areas/venice'
import { BaseRule, Geography, ModalityStatesToEvents, RULE_TYPE } from '@mds-core/mds-types'
import { START_ONE_MONTH_FROM_NOW, uuid, yesterday } from '@mds-core/mds-utils'
import { FeatureCollection } from 'geojson'
import { PolicyDomainCreateModel, PolicyService } from '../@types'

export const GeographyFactory = (overrides = {}): Geography => ({
  name: 'random geo',
  geography_id: uuid(),
  geography_json: VENICE as FeatureCollection,
  publish_date: yesterday(),
  ...overrides
})

export const RulesFactory = (overrides = {}): BaseRule<ModalityStatesToEvents, Exclude<RULE_TYPE, 'rate'>>[] => [
  {
    rule_type: 'count',
    rule_id: uuid(),
    name: 'Random Rule',
    geographies: [GeographyFactory().geography_id],
    states: { available: [] },
    vehicle_types: [],
    maximum: 3000,
    minimum: 500,
    ...overrides
  }
]

export const PolicyFactory = (overrides: Partial<PolicyDomainCreateModel> = {}): PolicyDomainCreateModel => ({
  name: 'MDSPolicy 1',
  description: 'Mobility caps as described in the One-Year Permit',
  policy_id: uuid(),
  start_date: START_ONE_MONTH_FROM_NOW,
  end_date: null,
  prev_policies: null,
  provider_ids: [],
  rules: RulesFactory(),
  ...overrides
})

export const createPolicyAndGeographyFactory = async (
  policyServiceClient: ServiceClient<PolicyService>,
  geographyServiceClient: ServiceClient<GeographyService>,
  policy?: PolicyDomainCreateModel,
  geography_overrides = {}
) => {
  const createdPolicy = await policyServiceClient.writePolicy(policy || PolicyFactory())
  await geographyServiceClient.writeGeographies([
    {
      name: 'VENICE',
      geography_id: createdPolicy.rules[0].geographies[0],
      geography_json: VENICE,
      ...geography_overrides
    }
  ])
  return createdPolicy
}
