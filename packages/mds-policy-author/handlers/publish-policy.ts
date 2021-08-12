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

import logger from '@mds-core/mds-logger'
import { PolicyServiceClient } from '@mds-core/mds-policy-service'
import { now } from '@mds-core/mds-utils'
import express from 'express'
import { PolicyAuthorApiPublishPolicyRequest, PolicyAuthorApiPublishPolicyResponse } from '../types'

export const PublishPolicyHandler = async (
  req: PolicyAuthorApiPublishPolicyRequest,
  res: PolicyAuthorApiPublishPolicyResponse,
  next: express.NextFunction
) => {
  const { policy_id } = req.params
  try {
    const policy = await PolicyServiceClient.publishPolicy(policy_id, now())
    return res.status(200).send({ version: res.locals.version, data: { policy } })
  } catch (error) {
    /* istanbul ignore next */
    logger.error('failed to publish policy', error.stack)
    /* istanbul ignore next */
    return next(error)
  }
}
