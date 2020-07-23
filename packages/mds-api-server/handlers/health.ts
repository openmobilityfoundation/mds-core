import { ApiRequest, ApiResponse } from '../@types'
import { healthInfo } from '../utils'

export const HealthRequestHandler = async (req: ApiRequest, res: ApiResponse) => res.status(200).send(healthInfo())
