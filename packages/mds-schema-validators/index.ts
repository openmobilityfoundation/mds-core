import Joi from 'joi'
import { ValidationError } from '@mds-core/mds-utils'

export const schemaValidator = <T>(schema: Joi.Schema, options?: Joi.ValidationOptions) => ({
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
