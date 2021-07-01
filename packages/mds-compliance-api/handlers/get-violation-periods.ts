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

import { parseRequest } from '@mds-core/mds-api-helpers'
import { ApiRequestQuery } from '@mds-core/mds-api-server'
import { ComplianceServiceClient, ComplianceViolationPeriodDomainModel } from '@mds-core/mds-compliance-service'
import logger from '@mds-core/mds-logger'
import { isError } from '@mds-core/mds-service-helpers'
import { Timestamp } from '@mds-core/mds-types'
import { AuthorizationError, BadParamsError, isDefined, now, ServerError } from '@mds-core/mds-utils'
import express from 'express'
import { ComplianceAggregate, ComplianceApiRequest, ComplianceApiResponse } from '../@types'
import { base64EncodeArray } from './helpers'
export type ComplianceApiGetViolationPeriodsRequest = ComplianceApiRequest &
  ApiRequestQuery<'start_time' | 'end_time' | 'provider_ids' | 'policy_ids'>

export type ComplianceApiGetViolationPeriodsResponse = ComplianceApiResponse<{
  start_time: Timestamp
  end_time: Timestamp
  results: ComplianceAggregate[]
}>

export const GetViolationPeriodsHandler = async (
  req: ComplianceApiGetViolationPeriodsRequest,
  res: ComplianceApiGetViolationPeriodsResponse,
  next: express.NextFunction
) => {
  try {
    const { scopes } = res.locals
    const { start_time, end_time = now() } = parseRequest(req)
      .single({ parser: Number })
      .query('start_time', 'end_time')
    if (!isDefined(start_time)) {
      throw new BadParamsError('Missing required query param start_time')
    }
    const { policy_id: policy_ids, provider_id: provider_ids } = parseRequest(req)
      .list()
      .query('provider_id', 'policy_id')

    const providerIDsOptionValue = (() => {
      if (scopes.includes('compliance:read')) {
        return provider_ids
      }
      if (scopes.includes('compliance:read:provider')) {
        if (res.locals.claims && res.locals.claims.provider_id) {
          const { provider_id } = res.locals.claims
          return [provider_id]
        }
        throw new AuthorizationError('provider_id missing from token with only compliance:read:provider scope')
      }
    })()

    const violationPeriodsArray = await ComplianceServiceClient.getComplianceViolationPeriods({
      start_time,
      end_time,
      provider_ids: providerIDsOptionValue,
      policy_ids
    })

    const results = violationPeriodsArray.map(periodArray => {
      const { policy_id, provider_id, provider_name, violation_periods } = periodArray
      return {
        policy_id,
        provider_id,
        provider_name,
        violation_periods: violation_periods.map((period: ComplianceViolationPeriodDomainModel) => {
          const { compliance_snapshot_ids, start_time: period_start_time, end_time: period_end_time } = period
          return {
            start_time: period_start_time,
            end_time: period_end_time,
            snapshots_uri: `/compliance_snapshot_ids?compliance_ids_token=${base64EncodeArray(compliance_snapshot_ids)}`
          }
        })
      }
    })

    const { version } = res.locals
    return res.status(200).send({ version, start_time, end_time, results })
  } catch (error) {
    if (isError(error, BadParamsError)) return res.status(400).send({ error })

    if (isError(error, AuthorizationError)) return res.status(403).send({ error })

    logger.error(error)
    res.status(500).send({ error: new ServerError() })
  }
}
