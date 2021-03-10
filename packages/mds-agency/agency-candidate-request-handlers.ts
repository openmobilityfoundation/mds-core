/**
 * Copyright 2019 City of Los Angeles
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

import { isUUID } from '@mds-core/mds-utils'
import db from '@mds-core/mds-db'
import { providerName } from '@mds-core/mds-providers'
import { parseRequest } from '@mds-core/mds-api-helpers'
import { AgencyApiRequest, AgencyApiResponse } from './types'

export const readAllVehicleIds = async (req: AgencyApiRequest, res: AgencyApiResponse) => {
  // read all the devices
  const { provider_id: query_provider_id } = parseRequest(req).single().query('provider_id')

  if (query_provider_id && !isUUID(query_provider_id)) {
    return res.status(400).send({
      error: 'bad_param',
      error_description: `invalid provider_id ${query_provider_id} is not a UUID`
    })
  }

  const items = await db.readDeviceIds(query_provider_id)
  const data: { [s: string]: string[] } = {}
  const summary: { [s: string]: number } = {}
  items.map(item => {
    const { device_id, provider_id } = item
    if (data[provider_id]) {
      data[provider_id].push(device_id)
      summary[providerName(provider_id)] += 1
    } else {
      data[provider_id] = [device_id]
      summary[providerName(provider_id)] = 1
    }
  })

  res.send({
    result: 'success',
    summary,
    data
  })
}
