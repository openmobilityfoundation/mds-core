import type { CompressionOptions } from 'compression'
import compression from 'compression'

export type CompressionMiddlewareOptions = Partial<CompressionOptions>

export const CompressionMiddleware = (options: CompressionMiddlewareOptions = {}) => compression(options)
