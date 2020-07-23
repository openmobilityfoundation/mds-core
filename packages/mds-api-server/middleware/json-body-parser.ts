import type { OptionsJson } from 'body-parser'
import bodyParser from 'body-parser'

export type JsonBodyParserMiddlewareOptions = Partial<OptionsJson>

export const JsonBodyParserMiddleware = (options: JsonBodyParserMiddlewareOptions = {}) =>
  bodyParser.json({ limit: '5mb', ...options })
