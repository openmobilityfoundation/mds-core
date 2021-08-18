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
import { PolicyDomainModel, PolicyServiceClient } from '@mds-core/mds-policy-service'
import { UUID } from '@mds-core/mds-types'
import { BadParamsError, NotFoundError, now } from '@mds-core/mds-utils'
import express from 'express'
import { PolicyApiGetPoliciesRequest, PolicyApiGetPoliciesResponse } from '../types'

export const GetPoliciesHandler = async (
  req: PolicyApiGetPoliciesRequest,
  res: PolicyApiGetPoliciesResponse,
  next: express.NextFunction
) => {
  const { start_date = now(), end_date = now() } = req.query
  const { scopes } = res.locals

  try {
    /*
      If the client is scoped to read unpublished policies,
      they are permitted to query for both published and unpublished policies.
      Otherwise, they can only read published.
    */
    const { get_published = null, get_unpublished = null } = scopes.includes('policies:read')
      ? parseRequest(req).single({ parser: JSON.parse }).query('get_published', 'get_unpublished')
      : { get_published: true }

    if (start_date > end_date) {
      throw new BadParamsError(`start_date must be after end_date`)
    }
    const policies = await PolicyServiceClient.readPolicies({ get_published, get_unpublished })
    const prev_policies: UUID[] = policies.reduce((prev_policies_acc: UUID[], policy: PolicyDomainModel) => {
      if (policy.prev_policies) {
        prev_policies_acc.push(...policy.prev_policies)
      }
      return prev_policies_acc
    }, [])
    const active = policies.filter(p => {
      // overlapping segment logic
      const p_start_date = p.start_date
      const p_end_date = p.end_date || Number.MAX_SAFE_INTEGER
      return end_date >= p_start_date && p_end_date >= start_date && !prev_policies.includes(p.policy_id)
    })

    if (active.length === 0) {
      throw new NotFoundError('No policies found!')
    }

    res.status(200).send({ version: res.locals.version, data: { policies: active } })
  } catch (error) {
    next(error)
  }
}
