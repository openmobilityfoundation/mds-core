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
import { ComplianceServiceClient, ComplianceSnapshotDomainModel } from '@mds-core/mds-compliance-service'
import db from '@mds-core/mds-db'
import logger from '@mds-core/mds-logger'
import { ProcessManager, SerializedBuffers } from '@mds-core/mds-service-helpers'
import { ModalityPolicy, ModalityPolicyTypeInfo } from '@mds-core/mds-types'
import { minutes, now } from '@mds-core/mds-utils'
import { processPolicy } from './engine'
import { getAllInputs, getSupersedingPolicies } from './engine/helpers'

const BATCH_SIZE = Number(process.env.BATCH_SIZE) || 5

async function batchComplianceSnapshots(snapshots: ComplianceSnapshotDomainModel[]) {
  let count = 0
  const computeSnapshotPromises: Promise<SerializedBuffers<ComplianceSnapshotDomainModel>[]>[] = []
  while (count < snapshots.length) {
    const batch = snapshots.slice(count, count + BATCH_SIZE)
    computeSnapshotPromises.push(ComplianceServiceClient.createComplianceSnapshots(batch))
    count += BATCH_SIZE
  }
  await Promise.all(computeSnapshotPromises)
}

export async function computeSnapshot() {
  // mds-db does a lazy init, so only the cache start is needed
  await cache.startup()
  const policies: ModalityPolicy[] = getSupersedingPolicies(await db.readActivePolicies<ModalityPolicyTypeInfo>())
  const geographies = await db.readGeographies({ get_published: true })
  const deviceEventInputs = await getAllInputs()

  const results = policies.map(policy => processPolicy(policy, geographies, deviceEventInputs))
  const snapshots = results.flat()

  await batchComplianceSnapshots(snapshots)
  logger.info('mds-compliance-engine successfully computed snapshots for the following policies: ', {
    policy_ids: policies.map(p => p.policy_id)
  })
}

ProcessManager(
  {
    start: async () => {
      try {
        const start = now()
        await computeSnapshot()
        const end = now()
        logger.info(`mds-compliance-engine time metrics`, { start, end, durationMs: end - start })

        process.exit(0)
      } catch (error) {
        logger.error('mds-compliance-engine ran into an error, retrying', error)
        throw error
      }
    },
    /**
     * Usually this is called to stop the process, but the snapshot computation stops itself,
     * so we leave this empty.
     */
   stop: async () => { } // eslint-disable-line
  },
  { retries: 3, maxTimeout: minutes(15) }
).monitor()
