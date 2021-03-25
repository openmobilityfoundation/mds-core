/**
 * Copyright 2021 City of Los Angeles
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

import Ajv, { SchemaObject, JSONSchemaType, Options, ValidateFunction } from 'ajv'
import withFormats from 'ajv-formats'

export type Schema<T> = SchemaObject | JSONSchemaType<T>

export type SchemaValidator<T> = {
  validate: (data: unknown) => data is T
  $schema: Schema<T> & { $schema: string }
}

export const SchemaValidator = <T>(schema: Schema<T>, options: Options = { allErrors: true }): SchemaValidator<T> => {
  const $schema = { $schema: 'http://json-schema.org/draft-07/schema#', ...schema }
  const validator: ValidateFunction<T> = withFormats(new Ajv(options)).compile($schema)
  return {
    validate: (data: unknown): data is T => {
      if (validator(data)) {
        return true
      }
      throw [...(validator.errors ?? [])]
    },
    $schema
  }
}
