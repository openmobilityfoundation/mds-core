import type { Options as OptionsRaw } from 'body-parser'
import bodyParser from 'body-parser'

export type RawBodyParserMiddlewareOptions = Partial<OptionsRaw>

export const RawBodyParserMiddleware = (options: RawBodyParserMiddlewareOptions = {}) =>
  bodyParser.raw({ limit: '5mb', ...options })
