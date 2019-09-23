import { AgencyApiRequest, AgencyApiResponse } from '@mds-core/mds-agency/types'
import log from '@mds-core/mds-logger'
import cache from '@mds-core/mds-cache'
import db from '@mds-core/mds-db'
import { ServerError } from '@mds-core/mds-utils'
import { refresh } from './utils'

export const getCacheInfo = async (req: AgencyApiRequest, res: AgencyApiResponse) => {
  const details = await cache.info()
  await log.warn('cache', details)
  res.send(details)
}

export const wipeDevice = async (req: AgencyApiRequest, res: AgencyApiResponse) => {
  try {
    const { device_id } = req.params
    await log.info('about to wipe', device_id)
    const cacheResult = await cache.wipeDevice(device_id)
    await log.info('cache wiped', cacheResult)
    const dbResult = await db.wipeDevice(device_id)
    await log.info('db wiped', dbResult)
    if (cacheResult >= 1) {
      res.send({
        result: `successfully wiped ${device_id}`
      })
    } else {
      res.status(404).send({
        result: `${device_id} not found (${cacheResult})`
      })
    }
  } catch (err) {
    await log.error(`/admin/wipe/:device_id failed`, err)
    res.status(500).send(new ServerError())
  }
}

export const refreshCache = async (req: AgencyApiRequest, res: AgencyApiResponse) => {
  // wipe the cache and rebuild from db
  let { skip, take } = req.query
  skip = parseInt(skip) || 0
  take = parseInt(take) || 10000000000

  try {
    const rows = await db.readDeviceIds()

    await log.info('read', rows.length, 'device_ids. skip', skip, 'take', take)
    const devices = rows.slice(skip, take + skip)
    await log.info('device_ids', devices)

    const promises = devices.map(device => refresh(device.device_id, device.provider_id))
    await Promise.all(promises)
    res.send({
      result: `success for ${devices.length} devices`
    })
  } catch (err) {
    await log.error('cache refresh fail', err)
    res.send({
      result: 'fail'
    })
  }
}
