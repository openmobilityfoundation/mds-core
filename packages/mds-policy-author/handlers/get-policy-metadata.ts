/* eslint-disable @typescript-eslint/no-explicit-any */
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

import { PolicyServiceClient } from '@mds-core/mds-policy-service'
import { BadParamsError, isUUID } from '@mds-core/mds-utils'
import express from 'express'
import { PolicyAuthorApiGetPolicyMetadatumRequest, PolicyAuthorApiGetPolicyMetadatumResponse } from '../types'

export const GetPolicyMetadataHandler = async (
  req: PolicyAuthorApiGetPolicyMetadatumRequest,
  res: PolicyAuthorApiGetPolicyMetadatumResponse,
  next: express.NextFunction
) => {
  const { policy_id } = req.params

  try {
    if (!isUUID(policy_id)) {
      throw new BadParamsError('policy_id is not a valid UUID')
    }

    const result = await PolicyServiceClient.readSinglePolicyMetadata(policy_id)
    return res.status(200).send({ version: res.locals.version, data: { policy_metadata: result } })
  } catch (error) {
    /* istanbul ignore next */
    return next(error)
  }
}
