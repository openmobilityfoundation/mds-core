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

import { PolicyMetadataDomainModel, PolicyServiceClient } from '@mds-core/mds-policy-service'
import { NotFoundError } from '@mds-core/mds-utils'
import express from 'express'
import { PolicyAuthorApiGetPolicyMetadataRequest, PolicyAuthorApiGetPolicyMetadataResponse } from '../types'

export const GetBulkPolicyMetadataHandler = async (
  req: PolicyAuthorApiGetPolicyMetadataRequest,
  res: PolicyAuthorApiGetPolicyMetadataResponse<Record<string, any>>,
  next: express.NextFunction
) => {
  const { get_published, get_unpublished } = req.query
  const params = {
    get_published: get_published ? get_published === 'true' : null,
    get_unpublished: get_unpublished ? get_unpublished === 'true' : null
  }

  try {
    const policy_metadata: PolicyMetadataDomainModel<Record<string, any>>[] =
      await PolicyServiceClient.readBulkPolicyMetadata(params)

    if (policy_metadata.length === 0) {
      throw new NotFoundError('No metadata found')
    }

    res.status(200).send({ version: res.locals.version, data: { policy_metadata } })
  } catch (error) {
    /* istanbul ignore next */
    return next(error)
  }
}
