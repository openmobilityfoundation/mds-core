import { AgencyApiRequest, AgencyApiResponse } from '@mds-core/mds-agency/types'
import log from '@mds-core/mds-logger'
import {
  isUUID,
} from '@mds-core/mds-utils'
import db from '@mds-core/mds-db'
import { providerName } from '@mds-core/mds-providers'

export const readAllVehicleIds = async (req: AgencyApiRequest, res: AgencyApiResponse) => {
  // read all the devices
  const query_provider_id = req.query.provider_id

  if (query_provider_id && !isUUID(query_provider_id)) {
    return res.status(400).send({
      error: 'bad_param',
      error_description: `invalid provider_id ${query_provider_id} is not a UUID`
    })
  }

  await log.info(query_provider_id ? providerName(query_provider_id) : null, 'get /vehicles')

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