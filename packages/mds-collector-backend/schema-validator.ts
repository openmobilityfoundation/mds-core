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

import Ajv, { AnySchema, Options } from 'ajv'
import withFormats from 'ajv-formats'

export const SchemaValidator = <Schema extends AnySchema>(schema: Schema, options: Options = { allErrors: true }) => {
  const validator = withFormats(new Ajv(options)).compile<Schema>(schema)
  return {
    validate: <T extends object = object>(data: unknown): data is T => {
      if (validator(data)) {
        return true
      }
      throw validator.errors ?? []
    },
    schema: validator.schema
  }
}

export type SchemaValidator = ReturnType<typeof SchemaValidator>
