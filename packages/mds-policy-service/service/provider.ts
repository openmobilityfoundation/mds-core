/**
 * Copyright 2020 City of Los Angeles
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

import { GeographyServiceClient } from '@mds-core/mds-geography-service'
import logger from '@mds-core/mds-logger'
import { ProcessController, ServiceException, ServiceProvider, ServiceResult } from '@mds-core/mds-service-helpers'
import { BadParamsError, DependencyMissingError } from '@mds-core/mds-utils'
import { PolicyService } from '../@types'
import { PolicyRepository } from '../repository'
import { validatePolicyDomainModel, validatePolicyMetadataDomainModel, validatePresentationOptions } from './validators'

const serviceErrorWrapper = async <T>(method: string, exec: () => Promise<T>) => {
  try {
    return ServiceResult(await exec())
  } catch (error) {
    const exception = ServiceException(`Error Policy:${method}`, error)
    logger.error(`mds-policy-service::${method} error`, { exception, error })
    return exception
  }
}

export const PolicyServiceProvider: ServiceProvider<PolicyService> & ProcessController = {
  start: PolicyRepository.initialize,
  stop: PolicyRepository.shutdown,
  name: async () => ServiceResult('mds-policy-service'),
  writePolicy: policy =>
    serviceErrorWrapper('writePolicy', () => PolicyRepository.writePolicy(validatePolicyDomainModel(policy))),
  readPolicies: (params, presentationOptions) =>
    serviceErrorWrapper('readPolicies', () =>
      PolicyRepository.readPolicies(params, validatePresentationOptions(presentationOptions ?? {}))
    ),
  readActivePolicies: timestamp =>
    serviceErrorWrapper('readActivePolicies', () => PolicyRepository.readActivePolicies(timestamp)),
  deletePolicy: policy_id => serviceErrorWrapper('deletePolicy', () => PolicyRepository.deletePolicy(policy_id)),
  editPolicy: policy =>
    serviceErrorWrapper('editPolicy', () => PolicyRepository.editPolicy(validatePolicyDomainModel(policy))),
  readPolicy: (policy_id, presentationOptions) =>
    serviceErrorWrapper('readPolicy', () =>
      PolicyRepository.readPolicy(policy_id, validatePresentationOptions(presentationOptions ?? {}))
    ),
  readSinglePolicyMetadata: policy_id =>
    serviceErrorWrapper('readSinglePolicyMetadata', () => PolicyRepository.readSinglePolicyMetadata(policy_id)),
  readBulkPolicyMetadata: params =>
    serviceErrorWrapper('readBulkPolicyMetadata', () => {
      if (params.get_unpublished && params.get_published)
        throw new BadParamsError('cannot have get_unpublished and get_published both be true')

      return PolicyRepository.readBulkPolicyMetadata(params)
    }),
  updatePolicyMetadata: policy_metadata =>
    serviceErrorWrapper('updatePolicyMetadata', () =>
      PolicyRepository.updatePolicyMetadata(validatePolicyMetadataDomainModel(policy_metadata))
    ),
  writePolicyMetadata: policy_metadata =>
    serviceErrorWrapper('writePolicyMetadata', () =>
      PolicyRepository.writePolicyMetadata(validatePolicyMetadataDomainModel(policy_metadata))
    ),
  publishPolicy: (policy_id, publish_date) =>
    serviceErrorWrapper('publishPolicy', async () => {
      const { rules, prev_policies } = await PolicyRepository.readPolicy(policy_id)
      const geographies = await GeographyServiceClient.getGeographiesByIds(rules.map(r => r.geographies).flat())

      if (geographies.some(geography => !geography?.publish_date))
        throw new DependencyMissingError(`some geographies not published!`)

      const publishedPolicy = await PolicyRepository.publishPolicy(policy_id, publish_date)

      if (prev_policies) {
        await Promise.all(
          prev_policies.map(superseded_policy_id =>
            PolicyRepository.updatePolicySupersededByColumn(superseded_policy_id, policy_id)
          )
        )
      }

      return publishedPolicy
    })
}
