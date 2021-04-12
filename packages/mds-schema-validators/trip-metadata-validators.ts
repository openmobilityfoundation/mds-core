import Joi from 'joi'
import { TripMetadata, RESERVATION_METHODS, RESERVATION_TYPES, PAYMENT_METHODS } from '@mds-core/mds-types'
import { RuntimeError } from '@mds-core/mds-utils'
import {
  uuidSchema,
  ValidateSchema,
  numberSchema,
  timestampSchema,
  accessibilityOptionsSchema,
  stringSchema
} from './validators'

export const tripMetadataSchema = Joi.object().keys({
  trip_id: uuidSchema.required(),
  provider_id: uuidSchema.required(),
  requested_trip_start_location: Joi.object()
    .keys({
      lng: numberSchema.required(),
      lat: numberSchema.required()
    })
    .optional(),
  reservation_time: timestampSchema.required(),
  reservation_method: stringSchema.valid(...RESERVATION_METHODS).required(),
  reservation_type: stringSchema.valid(...RESERVATION_TYPES).required(),
  quoted_trip_start_time: timestampSchema.required(),
  dispatch_time: timestampSchema.optional(),
  trip_start_time: timestampSchema.optional(),
  trip_end_time: timestampSchema.optional(),
  cancellation_reason: stringSchema.optional(),
  accessibility_options: Joi.array().items(accessibilityOptionsSchema).optional(),
  distance: numberSchema.optional(),
  fare: Joi.object()
    .keys({
      quoted_cost: numberSchema.optional(),
      actual_cost: numberSchema.optional(),
      components: Joi.object().optional(),
      currency: stringSchema.optional(),
      payment_methods: Joi.array()
        .items(stringSchema.valid(...PAYMENT_METHODS))
        .optional()
    })
    .optional()
})

export const validateTripMetadata = (metadata: unknown) => {
  if (ValidateSchema<TripMetadata>(metadata, tripMetadataSchema, { assert: true, allowUnknown: false })) return metadata
  throw new RuntimeError('This should never happen')
}
