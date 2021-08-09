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
import { DependencyMissingError } from '@mds-core/mds-utils'
import { PolicyService } from '../@types'
import { PolicyRepository } from '../repository'
import { validatePolicyDomainModel, validatePolicyMetadataDomainModel } from './validators'

const serviceToPolicyRepository = async <T>(method: string, exec: () => Promise<T>) => {
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
    serviceToPolicyRepository('writePolicy', () => PolicyRepository.writePolicy(validatePolicyDomainModel(policy))),
  readPolicies: params => serviceToPolicyRepository('readPolicies', () => PolicyRepository.readPolicies(params)),
  readActivePolicies: timestamp =>
    serviceToPolicyRepository('readActivePolicies', () => PolicyRepository.readActivePolicies(timestamp)),
  deletePolicy: policy_id => serviceToPolicyRepository('deletePolicy', () => PolicyRepository.deletePolicy(policy_id)),
  editPolicy: policy =>
    serviceToPolicyRepository('editPolicy', () => PolicyRepository.editPolicy(validatePolicyDomainModel(policy))),
  readPolicy: policy_id => serviceToPolicyRepository('readPolicy', () => PolicyRepository.readPolicy(policy_id)),
  readSinglePolicyMetadata: policy_id =>
    serviceToPolicyRepository('readSinglePolicyMetadata', () => PolicyRepository.readSinglePolicyMetadata(policy_id)),
  readBulkPolicyMetadata: params =>
    serviceToPolicyRepository('readSinglePolicyMetadata', () => PolicyRepository.readBulkPolicyMetadata(params)),
  updatePolicyMetadata: policy_metadata =>
    serviceToPolicyRepository('updatePolicyMetadata', () =>
      PolicyRepository.updatePolicyMetadata(validatePolicyMetadataDomainModel(policy_metadata))
    ),
  writePolicyMetadata: policy_metadata =>
    serviceToPolicyRepository('writePolicyMetadata', () =>
      PolicyRepository.writePolicyMetadata(validatePolicyMetadataDomainModel(policy_metadata))
    ),
  publishPolicy: async (policy_id, publish_date) => {
    try {
      const policy = await PolicyRepository.readPolicy(policy_id)
      const geographies = await GeographyServiceClient.getGeographiesByIds(policy.rules.map(r => r.geographies).flat())

      if (geographies.some(geography => !geography?.publish_date)) {
        throw new DependencyMissingError(`some geographies not published!`)
      }

      return ServiceResult(await PolicyRepository.publishPolicy(policy_id, publish_date))
    } catch (error) {
      const exception = ServiceException(`Error Policy:publishPolicy`, error)
      logger.error(`mds-policy-service::publishPolicy error`, { exception, error })
      return exception
    }
  }
}
