/*
    Copyright 2019-2020 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import httpContext from 'express-http-context'

const logger: Pick<Console, 'info' | 'warn' | 'error'> = console
type LogLevel = keyof typeof logger

const redact = (args: unknown[]): string[] =>
  args.map(arg =>
    JSON.stringify(arg instanceof Error ? arg.toString() : arg, (k, v) =>
      ['lat', 'lng'].includes(k) ? '[REDACTED]' : v
    )
  )

const log = (level: LogLevel, ...args: unknown[]): string[] => {
  const redacted = process.env.QUIET === 'true' ? [] : redact(args)
  if (redacted.length) {
    const timestamp = Date.now()
    const ISOTimestamp = new Date(timestamp).toISOString()
    const requestId = httpContext.get('x-request-id')

    logger[level](level.toUpperCase(), ISOTimestamp, timestamp, ...(requestId ? [requestId] : []), ...redacted)
  }
  return redacted
}

const info = (...args: unknown[]) => log('info', ...args)
const warn = (...args: unknown[]) => log('warn', ...args)
const error = (...args: unknown[]) => log('error', ...args)

export default { log, info, warn, error }
