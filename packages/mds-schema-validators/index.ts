import Joi from 'joi'
import { ValidationError } from '@mds-core/mds-utils'

export const schemaValidator = <T>(schema: Joi.Schema) => ({
  validate: (value: unknown): T => {
    const { error } = schema.validate(value)
    if (error) {
      throw new ValidationError(error.message, value)
    }
    return value as T
  },
  isValid: (value: unknown): value is T => !schema.validate(value).error
})

export * from './validators'
