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

import { ApiRequestParams } from '@mds-core/mds-api-server'
import { CollectorService, CollectorServiceClient } from '@mds-core/mds-collector-backend'
import type { NextFunction } from 'express'
import HttpStatus from 'http-status-codes'
import { CollectorApiRequest, CollectorApiResponse } from '../@types'

export type CollectorApiGetMessageSchemaRequest = CollectorApiRequest & ApiRequestParams<'schema_id'>

export type CollectorApiGetMessageSchemaResponseBody = ReturnType<CollectorService['getMessageSchema']>

export type CollectorApiGetMessageSchemaResponse = CollectorApiResponse<CollectorApiGetMessageSchemaResponseBody>

export const GetMessageSchemaHandler = async (
  req: CollectorApiGetMessageSchemaRequest,
  res: CollectorApiGetMessageSchemaResponse,
  next: NextFunction
) => {
  try {
    const { schema_id } = req.params
    const schema = await CollectorServiceClient.getMessageSchema(schema_id)
    return res.status(HttpStatus.OK).send(schema)
  } catch (error) {
    next(error)
  }
}
