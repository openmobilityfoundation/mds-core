/**
 * Copyright 2021 City of Los Angeles
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

import cache from '@mds-core/mds-agency-cache'
import { ComplianceServiceClient } from '@mds-core/mds-compliance-service'
import db from '@mds-core/mds-db'
import { ModalityPolicy, ModalityPolicyTypeInfo } from '@mds-core/mds-types'
import { processPolicy } from './engine'

async function getActiveUnsupersededPolicies(): Promise<ModalityPolicy[]> {
  return db.filterUnsupersededPolicies<ModalityPolicyTypeInfo>(await db.readActivePolicies<ModalityPolicyTypeInfo>())
}

async function main() {
  await cache.startup()
  const policies: ModalityPolicy[] = await getActiveUnsupersededPolicies()
  const geographies = await db.readGeographies({ get_published: true })
  console.log('promise.all')
  const results = await Promise.all(
    policies.map(policy => {
      return processPolicy(policy, geographies)
    })
  )
  await cache.shutdown()
  console.log('snapshots')
  const snapshots = results.flat()
  console.log(snapshots)
  await ComplianceServiceClient.createComplianceSnapshots(snapshots)
}

main()
  .then(res => {
    console.log('success')
    console.log(res)
    return cache.shutdown()
  })
  .then(res => {
    return db.shutdown()
  })
  .catch(err => console.log('failure: ', err))
