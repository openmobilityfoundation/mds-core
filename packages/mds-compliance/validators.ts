import * as Joi from '@hapi/joi'

import { VEHICLE_EVENTS, VEHICLE_TYPES, Policy, Geography, VehicleEvent } from '@mds-core/mds-types'
import { ValidationError } from '@mds-core/mds-utils'

const DAYS_OF_WEEK = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

const ruleSchema = Joi.object().keys({
  name: Joi.string().required(),
  rule_id: Joi.string()
    .guid()
    .required(),
  rule_type: Joi.string()
    .valid('count', 'time', 'speed', 'user')
    .required(),
  rule_units: Joi.string().valid('seconds', 'minutes', 'hours', 'mph', 'kph'),
  geographies: Joi.array().items(Joi.string().guid()),
  statuses: Joi.object().keys({
    available: Joi.array(),
    reserved: Joi.array(),
    unavailable: Joi.array(),
    removed: Joi.array(),
    inactive: Joi.array(),
    trip: Joi.array(),
    elsewhere: Joi.array()
  }),
  vehicle_types: Joi.array().items(Joi.string().valid(...Object.values(VEHICLE_TYPES))),
  maximum: Joi.number(),
  minimum: Joi.number(),
  start_time: Joi.string(),
  end_time: Joi.string(),
  days: Joi.array().items(Joi.string().valid(...DAYS_OF_WEEK)),
  messages: Joi.object(),
  value_url: Joi.string().uri()
})

const policiesSchema = Joi.array().items(
  Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string().required(),
    policy_id: Joi.string()
      .guid()
      .required(),
    start_date: Joi.date()
      .timestamp('javascript')
      .required(),
    end_date: Joi.date()
      .timestamp('javascript')
      .allow(null),
    prev_policies: Joi.array()
      .items(Joi.string().guid())
      .allow(null),
    rules: Joi.array()
      .min(1)
      .items(ruleSchema)
      .required()
  })
)

const featureSchema = Joi.object()
  .keys({
    type: Joi.string()
      .valid('Feature')
      .required(),
    properties: Joi.object().required(),
    geometry: Joi.object().required()
  })
  .unknown(true) // TODO

const featureCollectionSchema = Joi.object()
  .keys({
    type: Joi.string()
      .valid('FeatureCollection')
      .required(),
    features: Joi.array()
      .min(1)
      .items(featureSchema)
      .required()
  })
  .unknown(true) // TODO

const geographiesSchema = Joi.array().items(
  Joi.object()
    .keys({
      geography_id: Joi.string()
        .guid()
        .required(),
      geography_json: featureCollectionSchema,
      read_only: Joi.boolean().allow(null),
      previous_geography_ids: Joi.array()
        .items(Joi.string().guid())
        .allow(null),
      name: Joi.string().required()
    })
    .unknown(true)
)

const eventsSchema = Joi.array().items(
  Joi.object().keys({
    device_id: Joi.string()
      .guid()
      .required(),
    provider_id: Joi.string()
      .guid()
      .required(),
    timestamp: Joi.date()
      .timestamp('javascript')
      .required(),
    event_type: Joi.string().valid(...Object.values(VEHICLE_EVENTS)),
    event_type_reason: Joi.string(),
    telemetry_timestamp: Joi.date().timestamp('javascript'),
    telemetry: Joi.object(), // TODO Add telemetry schema
    trip_id: Joi.string().guid(),
    service_area_id: Joi.string().guid(),
    recorded: Joi.date().timestamp('javascript')
  })
)

const Format = (property: string, error: Joi.ValidationError): string => {
  const [{ message, path }] = error.details
  const [, ...details] = message.split(' ')
  return `${[property, ...path].join('.')} ${details.join(' ')}`
}

export function validatePolicies(policies: unknown): policies is Policy[] {
  const { error } = policiesSchema.validate(policies)
  if (error) {
    throw new ValidationError('invalid_policies', {
      policies,
      details: Format('policies', error)
    })
  }
  return true
}

export function validateGeographies(geographies: unknown): geographies is Geography[] {
  const { error } = geographiesSchema.validate(geographies)
  if (error) {
    throw new ValidationError('invalid_geographies', {
      geographies,
      details: Format('geographies', error)
    })
  }
  return true
}

export function validateEvents(events: unknown): events is VehicleEvent[] {
  const { error } = eventsSchema.validate(events)
  if (error) {
    throw new ValidationError('invalid events', {
      events,
      details: Format('events', error)
    })
  }
  return true
}
