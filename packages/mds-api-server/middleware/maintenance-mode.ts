import express from 'express'
import { ApiRequest, ApiResponse } from '../@types'
import { healthInfo } from '../utils'

export type MaintenanceModeMiddlewareOptions = Partial<{}>

export const MaintenanceModeMiddleware = (options: MaintenanceModeMiddlewareOptions = {}) => (
  req: ApiRequest,
  res: ApiResponse,
  next: express.NextFunction
) => (process.env.MAINTENANCE ? res.status(503).send(healthInfo()) : next())
