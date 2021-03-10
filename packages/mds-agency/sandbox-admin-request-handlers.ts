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

import logger from '@mds-core/mds-logger'
import cache from '@mds-core/mds-agency-cache'
import db from '@mds-core/mds-db'
import { ServerError } from '@mds-core/mds-utils'
import { parseRequest } from '@mds-core/mds-api-helpers'
import { ApiRequestParams, ApiRequestQuery } from '@mds-core/mds-api-server'
import { AgencyApiRequest, AgencyApiResponse } from './types'
import { refresh } from './utils'

export const getCacheInfo = async (req: AgencyApiRequest, res: AgencyApiResponse) => {
  try {
    const details = await cache.info()
    logger.warn('cache', details)
    res.status(200).send(details)
  } catch (err) {
    res.status(500).send(new ServerError())
  }
}

export type AgencyApiWipeDeviceRequest = AgencyApiRequest & ApiRequestParams<'device_id'>

export const wipeDevice = async (req: AgencyApiWipeDeviceRequest, res: AgencyApiResponse) => {
  try {
    const { device_id } = req.params
    logger.info('about to wipe device', { device_id })
    const cacheResult = await cache.wipeDevice(device_id)
    logger.info('cache wiped for device', { cacheResult })
    const dbResult = await db.wipeDevice(device_id)
    logger.info('db wiped for device', { dbResult })
    if (cacheResult >= 1) {
      res.status(200).send({
        result: `successfully wiped ${device_id}`
      })
    } else {
      res.status(404).send({
        result: `${device_id} not found (${cacheResult})`
      })
    }
  } catch (err) {
    logger.error(`/admin/wipe/:device_id failed`, err)
    res.status(500).send(new ServerError())
  }
}

export type AgencyApiRefreshCacheRequest = AgencyApiRequest & ApiRequestQuery<'skip' | 'take'>

export const refreshCache = async (req: AgencyApiRefreshCacheRequest, res: AgencyApiResponse) => {
  // wipe the cache and rebuild from db
  const { skip = 0, take = 10000000000 } = parseRequest(req).single({ parser: Number }).query('skip', 'take')

  try {
    const rows = await db.readDeviceIds()

    logger.info(`read ${rows.length} device_ids.`, { skip, take })
    const devices = rows.slice(skip, take + skip)
    logger.info('device_ids', { devices })

    const promises = devices.map(device => refresh(device.device_id, device.provider_id))
    await Promise.all(promises)
    res.status(200).send({
      result: `success for ${devices.length} devices`
    })
  } catch (err) {
    logger.error('cache refresh fail', err)
    res.status(500).send(new ServerError())
  }
}
