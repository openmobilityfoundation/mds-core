import { PAYMENT_METHODS, RESERVATION_METHODS, RESERVATION_TYPES, TripMetadata } from '@mds-core/mds-types'
import { RuntimeError } from '@mds-core/mds-utils'
import Joi from 'joi'
import {
  accessibilityOptionsSchema,
  numberSchema,
  stringSchema,
  timestampSchema,
  uuidSchema,
  ValidateSchema
} from './validators'

/**
 * Note: This schema is still very-much-so in flux (especially dependent on mode), so we're keeping this minimal for now. If you see any required bits commented out, this is due to wanting to retain some previous iterations for posterity.
 */
export const tripMetadataSchema = Joi.object().keys({
  trip_id: uuidSchema.required(),
  provider_id: uuidSchema.required(),
  requested_trip_start_location: Joi.object()
    .keys({
      lng: numberSchema.required(),
      lat: numberSchema.required()
    })
    .optional(),
  reservation_time: timestampSchema.optional() /*.required()*/,
  reservation_method: stringSchema.valid(...RESERVATION_METHODS).optional() /*.required()*/,
  reservation_type: stringSchema.valid(...RESERVATION_TYPES).optional() /*.required()*/,
  quoted_trip_start_time: timestampSchema.optional() /*.required()*/,
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
  if (ValidateSchema<TripMetadata>(metadata, tripMetadataSchema, { assert: true, allowUnknown: true })) return metadata
  throw new RuntimeError('This should never happen')
}
