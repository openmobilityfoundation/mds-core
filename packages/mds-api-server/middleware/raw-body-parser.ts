import type { Options as OptionsRaw } from 'body-parser'
import bodyParser from 'body-parser'

export type RawBodyParserMiddlewareOptions = Partial<OptionsRaw>

export const RawBodyParserMiddleware = ({ limit = '5mb', ...options }: RawBodyParserMiddlewareOptions = {}) =>
  bodyParser.raw({ limit, ...options })
