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

import { UUID } from '@mds-core/mds-types'
import { parseRequest } from '@mds-core/mds-api-helpers'
import { isDefined } from '@mds-core/mds-utils'
import { ComplianceApiRequest, ComplianceApiResponse } from '../@types'
import { base64DecodeComplianceIDsToken } from './helpers'

export type ComplianceApiGetComplianceSnapshotIDsRequest = ComplianceApiRequest

export type ComplianceApiGetComplianceSnapshotIDsResponse = ComplianceApiResponse<{
  data: UUID[]
}>

/**
 * A ComplianceAggregate might contain many, many snapshots. Instead of containing the snapshot ids
 * directly, it contains a token for each set of snapshot_ids that can be submitted to the following
 * handler. The spec makes no specific recommendations on how to associate tokens to arrays ofsnapshot
 * ids. Doing things this way enables us to easily swap in and out a different implementation in the future;
 * e.g. perhaps some day the token could correspond to a cache of the corresponding snapshot ids.
 * Currently, in this implementation, we base64-encode arrays of snapshot ids and decode the token.
 */
export const GetComplianceSnapshotIDsHandler = async (
  req: ComplianceApiGetComplianceSnapshotIDsRequest,
  res: ComplianceApiGetComplianceSnapshotIDsResponse
) => {
  try {
    const { compliance_ids_token } = parseRequest(req)
      .single({ parser: s => s })
      .query('compliance_ids_token')

    if (!isDefined(compliance_ids_token)) {
      return res.status(400).send({ error: 'Token not provided' })
    }

    const { version } = res.locals
    return res.status(200).send({ version, data: base64DecodeComplianceIDsToken(compliance_ids_token) })
  } catch (error) {
    return res.status(500).send({ error })
  }
}
