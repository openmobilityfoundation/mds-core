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

import Joi from 'joi'
import Ajv, { SchemaObject, JSONSchemaType, Options, ValidateFunction } from 'ajv'
import withFormats from 'ajv-formats'
import { ValidationError } from '@mds-core/mds-utils'

export type Schema<T> = SchemaObject | JSONSchemaType<T>

export type SchemaValidator<T> = {
  validate: (input: unknown) => T
  isValid: (input: unknown) => input is T
  $schema: Schema<T> & { $schema: string }
}

export const SchemaValidator = <T>(schema: Schema<T>, options: Options = { allErrors: true }): SchemaValidator<T> => {
  const $schema = Object.assign({ $schema: 'http://json-schema.org/draft-07/schema#' }, schema)
  const validator: ValidateFunction<T> = withFormats(new Ajv(options)).compile($schema)
  return {
    validate: (input: unknown) => {
      if (!validator(input)) {
        const [{ instancePath, message } = { instancePath: 'Data', message: 'is invalid' }] = validator.errors ?? []
        throw new ValidationError(`${instancePath} ${message}`, validator.errors)
      }
      return input
    },
    isValid: (input: unknown): input is T => validator(input),
    $schema
  }
}

// Export an example schema for testing purposes
export * from './tests/test.schema'

/**
 * @deprecated JSON Schema based validation is preferable to Joi. Please use the SchemaValidator instead.
 */
export const schemaValidator = <T>(
  schema: Joi.Schema,
  options?: Joi.ValidationOptions
): Omit<SchemaValidator<T>, '$schema'> => ({
  validate: (input: unknown): T => {
    const { error, value } = schema.validate(input, options)
    if (error) {
      throw new ValidationError(error.message, input)
    }
    return value as T
  },
  isValid: (input: unknown): input is T => !schema.validate(input, options).error
})

export * from './validators'
export * from './v0_4_1'
