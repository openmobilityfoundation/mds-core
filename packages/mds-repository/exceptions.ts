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

import { ConflictError, ServerError } from '@mds-core/mds-utils'

const isError = (error: unknown): error is Error => error instanceof Error

const hasProperty = <T extends string>(property: T, error: unknown): error is { [P in T]: string } =>
  isError(error) && property in error

const getProperty = <T extends string>(property: T, error: unknown): string | undefined =>
  hasProperty(property, error) ? error[property] : undefined

export const RepositoryError = (error: unknown) => {
  if (isError(error)) {
    const code = getProperty('code', error)
    // READ ONLY SQL TRANSACTION: PG may return this error in the event of a failover to a replica; force a restart
    if (code === '25006') {
      process.exit(Number(code))
    }
    // UNIQUE VIOLATION
    if (code === '23505') {
      return new ConflictError(getProperty('detail', error), error)
    }
    return error
  }
  return new ServerError('Unexpected Repository Error', error)
}
