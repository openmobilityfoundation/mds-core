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

import stream, { StreamProducer } from '@mds-core/mds-stream'
import { getEnvVar } from '@mds-core/mds-utils'
import { ComplianceSnapshotDomainModel } from '../@types'

const { TENANT_ID } = getEnvVar({
  TENANT_ID: 'mds'
})

const complianceEventTopic = [TENANT_ID, 'compliance', 'snapshot'].join('.')

export type KafkaComplianceSnapshot = Omit<ComplianceSnapshotDomainModel, 'vehicles_found'>

export const ComplianceSnapshotStreamKafka: StreamProducer<KafkaComplianceSnapshot> =
  stream.KafkaStreamProducer<KafkaComplianceSnapshot>(complianceEventTopic)
