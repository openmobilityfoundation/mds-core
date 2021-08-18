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
import { PolicyServiceClient } from '@mds-core/mds-policy-service'
import { BadParamsError, isUUID, NotFoundError } from '@mds-core/mds-utils'
import express from 'express'
import { PolicyApiGetPolicyRequest, PolicyApiGetPolicyResponse } from '../types'

export const GetPolicyHandler = async (
  req: PolicyApiGetPolicyRequest,
  res: PolicyApiGetPolicyResponse,
  next: express.NextFunction
) => {
  const { policy_id } = req.params
  const { scopes } = res.locals

  try {
    if (!isUUID(policy_id)) {
      throw new BadParamsError(`policy_id ${policy_id} is not a valid UUID`)
    }

    /*
      If the client is scoped to read unpublished policies,
      they are permitted to query for both published and unpublished policies.
      Otherwise, they can only read published.
    */
    const { get_published = null, get_unpublished = null } = scopes.includes('policies:read')
      ? parseRequest(req).single({ parser: JSON.parse }).query('get_published', 'get_unpublished')
      : { get_published: true }

    const policies = await PolicyServiceClient.readPolicies({ policy_ids: [policy_id], get_published, get_unpublished })

    if (policies.length === 0) {
      throw new NotFoundError(`policy_id ${policy_id} not found`)
    }

    const [policy] = policies

    res.status(200).send({ version: res.locals.version, data: { policy } })
  } catch (error) {
    return next(error)
  }
}
