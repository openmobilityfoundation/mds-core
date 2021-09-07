/**
 * Copyright 2020 City of Los Angeles
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

import { SchemaObject, SchemaValidator } from '@mds-core/mds-schema-validators'
import {
  ACCESSIBILITY_OPTIONS,
  DAYS_OF_WEEK,
  MICRO_MOBILITY_VEHICLE_EVENTS,
  MICRO_MOBILITY_VEHICLE_STATE,
  MICRO_MOBILITY_VEHICLE_STATES,
  MODALITIES,
  SERVICE_TYPE,
  TAXI_VEHICLE_EVENTS,
  TAXI_VEHICLE_STATE,
  TAXI_VEHICLE_STATES,
  TNC_VEHICLE_EVENT,
  TNC_VEHICLE_STATE,
  TRANSACTION_TYPE,
  VEHICLE_TYPES
} from '@mds-core/mds-types'
import {
  PolicyDomainModel,
  PolicyMetadataDomainModel,
  PresentationOptions,
  RATE_RECURRENCE_VALUES,
  RULE_TYPES
} from '../@types'

const stringSchema = (options = {}) => ({ type: 'string', ...options })
const uuidSchema = { type: 'string', format: 'uuid' }
// Timestamp Schema that ensures milliseconds
const TimestampSchema = (options = {}) => ({
  type: 'integer',
  minimum: 100_000_000_000,
  maximum: 99_999_999_999_999,
  ...options
})

const arraySchema = (items = {}, options = {}) => ({
  type: 'array',
  items,
  ...options
})

const enumSchema = <T>(enumType: T[]) => ({ type: 'string', enum: enumType })

const micromobilityStateMap = MICRO_MOBILITY_VEHICLE_STATES.reduce<
  { [k in MICRO_MOBILITY_VEHICLE_STATE]?: SchemaObject }
>((acc, state) => {
  acc[state] = {
    type: 'array',
    items: { type: 'string', enum: [...MICRO_MOBILITY_VEHICLE_EVENTS] }
  }
  return acc
}, {})

const tncStateMap = TNC_VEHICLE_STATE.reduce<{ [k in TNC_VEHICLE_STATE]?: SchemaObject }>((acc, state) => {
  acc[state] = arraySchema(enumSchema([...TNC_VEHICLE_EVENT]))
  return acc
}, {})

const taxiStateMap = TAXI_VEHICLE_STATES.reduce<{ [k in TAXI_VEHICLE_STATE]?: SchemaObject }>((acc, state) => {
  acc[state] = arraySchema(enumSchema([...TAXI_VEHICLE_EVENTS]))
  return acc
}, {})

const stateModalityIfConditionSchema = (constString: string, props: {}) => ({
  if: { properties: { modality: { type: 'string', const: constString } } },
  then: {
    properties: {
      states: { type: 'object', properties: props, nullable: true }
    }
  }
})

const checkRateFieldsIfConditionSchema = () => ({
  if: {
    properties: {
      rules: {
        type: 'array',
        contains: {
          type: 'object',
          properties: {
            rule_type: { type: 'string', const: 'rate' }
          }
        }
      }
    }
  },
  then: {
    properties: {
      currency: stringSchema()
    },
    required: ['currency']
  }
})

export const {
  validate: validatePolicyDomainModel,
  isValid: isValidPolicyDomainModel,
  $schema: PolicyDomainModelSchema
} = SchemaValidator<PolicyDomainModel>({
  $id: 'PolicyDomainModel',
  type: 'object',

  properties: {
    policy_id: uuidSchema,
    name: stringSchema(),
    currency: stringSchema({ nullable: true }),
    description: stringSchema(),
    provider_ids: arraySchema(uuidSchema, { nullable: true }),
    start_date: TimestampSchema(),
    end_date: TimestampSchema({ nullable: true }),
    prev_policies: arraySchema(uuidSchema, { nullable: true }),
    publish_date: TimestampSchema({ nullable: true }),
    rules: {
      type: 'array',
      items: {
        $id: 'BaseRule',
        type: 'object',
        properties: {
          accessibility_options: arraySchema(enumSchema([...ACCESSIBILITY_OPTIONS]), { nullable: true }),
          days: arraySchema(enumSchema(Object.keys(DAYS_OF_WEEK)), { nullable: true }),
          end_time: stringSchema({ nullable: true }),
          geographies: arraySchema(uuidSchema),
          maximum: { type: 'number', nullable: true },
          messages: {
            $id: 'PolicyMessage',
            type: 'object'
          },
          minimum: { type: 'number', nullable: true },
          modality: enumSchema([...MODALITIES]),
          name: stringSchema(),
          rule_id: uuidSchema,
          rule_type: enumSchema(Object.keys(RULE_TYPES)),
          rule_units: stringSchema(),
          rate_amount: { type: 'number', nullable: true, default: null },
          rate_recurrence: {
            oneOf: [{ type: 'null' }, { type: 'string', enum: RATE_RECURRENCE_VALUES }]
          },
          start_time: stringSchema({ nullable: true }),
          value_url: stringSchema({ nullable: true }),
          vehicle_types: arraySchema(enumSchema([...VEHICLE_TYPES]), { nullable: true }),
          service_types: arraySchema(enumSchema([...SERVICE_TYPE]), { nullable: true, default: null }),
          transaction_types: arraySchema(enumSchema([...TRANSACTION_TYPE]), { nullable: true, default: null })
        },
        allOf: [
          stateModalityIfConditionSchema('micromobility', micromobilityStateMap),
          stateModalityIfConditionSchema('taxi', taxiStateMap),
          stateModalityIfConditionSchema('tnc', tncStateMap)
        ],
        required: ['geographies', 'name', 'rule_id', 'rule_type', 'states']
      }
    }
  },
  allOf: [checkRateFieldsIfConditionSchema()],
  required: ['policy_id', 'name', 'description', 'start_date', 'rules']
})

export const { validate: validatePolicyMetadataDomainModel, isValid: isValidPolicyMetadataDomainModel } =
  SchemaValidator<PolicyMetadataDomainModel>({
    $id: 'PolicyMetadataDomainModel',
    type: 'object',
    properties: {
      policy_id: { type: 'string', format: 'uuid' },
      policy_metadata: { type: 'object' }
    }
  })

export const { validate: validatePresentationOptions, isValid: isValidPresentationOptions } =
  SchemaValidator<PresentationOptions>({
    $id: 'PresentationOptions',
    type: 'object',
    properties: {
      withStatus: { type: 'boolean' }
    }
  })

export const schemas = [PolicyDomainModelSchema]
