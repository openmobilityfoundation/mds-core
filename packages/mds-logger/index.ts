/**
 * Copyright 2019 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import httpContext from 'express-http-context'
import pino, { Logger } from 'pino'
import { inspect } from 'util'

// Verify that defaultOptions is available (not available on non-nodejs platforms)
if (inspect?.defaultOptions) {
  // Set the inspector depth to infinity. To the moooooooon 🚀 🌕
  inspect.defaultOptions.depth = null
}

const logger: Pick<Logger, 'info' | 'warn' | 'error' | 'debug'> = pino(pino.destination({ sync: false }))
type LogLevel = keyof typeof logger

const redact = (arg: string | Record<string, unknown> | Error | undefined) => {
  if (arg === undefined) return {}
  const res = JSON.stringify(arg instanceof Error ? { error: arg.toString() } : arg, (k, v) =>
    ['lat', 'lng'].includes(k) ? '[REDACTED]' : v
  )

  return JSON.parse(res)
}

const log =
  (level: LogLevel) =>
  (
    message: string,
    data?: Record<string, unknown> | Error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): { log_message?: string; log_data?: any } => {
    if (process.env.QUIET === 'true') {
      return {}
    }

    const { log_message, log_data } = { log_message: redact(message), log_data: redact(data) }
    const log_timestamp = Date.now()
    const log_ISO_timestamp = new Date(log_timestamp).toISOString()
    const log_requestId = httpContext.get('x-request-id')

    logger[level]({
      log_level: level.toUpperCase(),
      log_ISO_timestamp,
      log_timestamp,
      ...(log_requestId ? { log_requestId } : {}),
      log_message,
      log_data
    })

    return { log_message, log_data }
  }

export default {
  log: (level: LogLevel, ...args: Parameters<ReturnType<typeof log>>) => log(level)(...args),
  debug: log('debug'),
  info: log('info'),
  warn: log('warn'),
  error: log('error')
}
