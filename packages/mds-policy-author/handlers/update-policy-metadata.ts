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
import { isError } from '@mds-core/mds-service-helpers'
import { NotFoundError } from '@mds-core/mds-utils'
import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { PolicyAuthorApiEditPolicyMetadataRequest, PolicyAuthorApiEditPolicyMetadataResponse } from '../types'

export const UpdatePolicyMetadataHandler = async (
  req: PolicyAuthorApiEditPolicyMetadataRequest,
  res: PolicyAuthorApiEditPolicyMetadataResponse,
  next: express.NextFunction
) => {
  const updatePolicyMetadata = req.body
  try {
    const policy_metadata = await PolicyServiceClient.updatePolicyMetadata(updatePolicyMetadata)
    return res.status(StatusCodes.OK).send({ version: res.locals.version, data: { policy_metadata } })
  } catch (updateErr) {
    if (isError(updateErr, NotFoundError)) {
      try {
        const policy_metadata = await PolicyServiceClient.writePolicyMetadata(updatePolicyMetadata)
        return res.status(StatusCodes.CREATED).send({ version: res.locals.version, data: { policy_metadata } })
      } catch (writeErr) {
        /* istanbul ignore next */
        return next(writeErr)
      }
    }
    /* istanbul ignore next */
    return next(updateErr)
  }
}
