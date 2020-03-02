import { UUID, Recorded, Device } from '@mds-core/mds-types'
import { isValidDeviceId } from '@mds-core/mds-schema-validators'
import { ValidationError, NotFoundError } from '@mds-core/mds-utils'
import db from '@mds-core/mds-db'
import { NativeApiRequest, NativeApiResponse } from '../types'
import { InternalServerError } from './utils'

type GetVehiclesRequest = NativeApiRequest<{ device_id: UUID }>

type GetVehiclesResponse = NativeApiResponse<{
  vehicle: Omit<Recorded<Device>, 'id'>
}>

export const GetVehiclesHandler = async (req: GetVehiclesRequest, res: GetVehiclesResponse) => {
  const { device_id } = req.params
  try {
    if (isValidDeviceId(device_id)) {
      const { id, ...vehicle } = await db.readDevice(device_id)
      return res.status(200).send({ version: res.locals.version, vehicle })
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      // 400 Bad Request
      return res.status(400).send({ error: err })
    }
    if (err instanceof Error && err.message.includes('not found')) {
      // 404 Not Found
      return res.status(404).send({ error: new NotFoundError('device_id_not_found', { device_id }) })
    }
    /* istanbul ignore next */
    return InternalServerError(req, res, err)
  }
}
