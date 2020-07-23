import type { CorsOptions } from 'cors'
import cors from 'cors'

export type CorsMiddlewareOptions = Partial<Omit<CorsOptions, 'preflightContinue'>>

export const CorsMiddleware = (options: CorsMiddlewareOptions = {}) => cors({ preflightContinue: true, ...options })
