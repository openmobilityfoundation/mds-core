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

import { DomainModelCreate } from '@mds-core/mds-repository'
import {
  ACCESSIBILITY_OPTION,
  DAY_OF_WEEK,
  Enum,
  MICRO_MOBILITY_VEHICLE_EVENT,
  MICRO_MOBILITY_VEHICLE_STATE,
  MODALITY,
  Nullable,
  SERVICE_TYPE,
  TAXI_VEHICLE_EVENT,
  TAXI_VEHICLE_STATE,
  Timestamp,
  TNC_VEHICLE_EVENT,
  TNC_VEHICLE_STATE,
  TRANSACTION_TYPE,
  UUID,
  VEHICLE_TYPE
} from '@mds-core/mds-types'

export const RULE_TYPES = Enum('count', 'speed', 'time', 'user', 'rate')
export type RULE_TYPE = keyof typeof RULE_TYPES
export interface PolicyMessage {
  [key: string]: string
}

export type GenericStatesToEvents<S extends string = string, E extends string = string> = {
  [K in S]?: E[] | []
}

export type MicroMobilityStatesToEvents = {
  [S in MICRO_MOBILITY_VEHICLE_STATE]: MICRO_MOBILITY_VEHICLE_EVENT[] | []
}

export type TaxiStatesToEvents = {
  [S in TAXI_VEHICLE_STATE]: TAXI_VEHICLE_EVENT[] | []
}

export type TNCStatesToEvents = {
  [S in TNC_VEHICLE_STATE]: TNC_VEHICLE_EVENT[] | []
}

/**
 * Base rule type which can be extended by an allowed state machine & rule types (often per modality).
 */
export interface BaseRule<StatesToEventsMap extends GenericStatesToEvents, RuleType extends RULE_TYPE = RULE_TYPE> {
  accessibility_options?: Nullable<ACCESSIBILITY_OPTION[]>
  days?: Nullable<DAY_OF_WEEK[]>
  end_time?: Nullable<string>
  geographies: UUID[]
  maximum?: Nullable<number>
  messages?: PolicyMessage
  minimum?: Nullable<number>
  modality?: MODALITY
  rate_amount?: Nullable<number>
  rate_recurrence?: Nullable<RATE_RECURRENCE>
  name: string
  rule_id: UUID
  rule_type: RuleType
  rule_units?: string
  start_time?: Nullable<string>
  states: Nullable<StatesToEventsMap>
  value_url?: Nullable<string>
  vehicle_types?: Nullable<VEHICLE_TYPE[]>
  transaction_types?: Nullable<TRANSACTION_TYPE[]>
  service_types?: Nullable<SERVICE_TYPE[]>
}

export interface MicroMobilityRule<RuleType extends RULE_TYPE = RULE_TYPE>
  extends BaseRule<Partial<MicroMobilityStatesToEvents>, RuleType> {
  modality?: 'micromobility'
}

export interface TaxiRule<RuleType extends RULE_TYPE = RULE_TYPE>
  extends BaseRule<Partial<TaxiStatesToEvents>, RuleType> {
  modality: 'taxi'
}

export interface TNCRule<RuleType extends RULE_TYPE = RULE_TYPE>
  extends BaseRule<Partial<TNCStatesToEvents>, RuleType> {
  modality: 'tnc'
}

export type Rule<RuleType extends RULE_TYPE = RULE_TYPE> =
  | MicroMobilityRule<RuleType>
  | TaxiRule<RuleType>
  | TNCRule<RuleType>

export type CountRule = Rule<'count'>

export type TimeRule = Rule<'time'> & {
  rule_units: 'minutes' | 'hours'
}

export type SpeedRule = Rule<'speed'> & {
  rule_units: 'kph' | 'mph'
}

export type UserRule = Rule<'user'>

export type RateRule = Rule<'rate'> & {
  rule_units: 'minutes' | 'hours'
  rate_amount: number
  rate_recurrence: RATE_RECURRENCE
}

export type StatesToEvents =
  | Partial<MicroMobilityStatesToEvents>
  | Partial<TNCStatesToEvents>
  | Partial<TaxiStatesToEvents>

export const RATE_RECURRENCE_VALUES = ['once', 'each_time_unit', 'per_complete_time_unit'] as const
export type RATE_RECURRENCE = typeof RATE_RECURRENCE_VALUES[number]

export const POLICY_STATUS = <const>['draft', 'pending', 'active', 'expired', 'deactivated', 'unknown']
export type POLICY_STATUS = typeof POLICY_STATUS[number]

export interface PolicyDomainModel {
  policy_id: UUID
  name: string
  currency: Nullable<string>
  description: string
  provider_ids: Nullable<UUID[]>
  start_date: Timestamp
  end_date: Nullable<Timestamp>
  prev_policies: Nullable<UUID[]>
  rules: Rule[]
  publish_date: Nullable<Timestamp>
  status?: POLICY_STATUS // Computed property which is returned from the service, not written on creation.
}

export type CountPolicy = PolicyDomainModel & { rules: CountRule[] }
export type SpeedPolicy = PolicyDomainModel & { rules: SpeedRule[] }
export type TimePolicy = PolicyDomainModel & { rules: TimeRule[] }
export type RatePolicy = PolicyDomainModel & { rules: RateRule[] }

export type PolicyDomainCreateModel = DomainModelCreate<PolicyDomainModel>

export interface PolicyMetadataDomainModel<M extends {} = {}> {
  policy_id: UUID
  policy_metadata: Nullable<Partial<M>>
}

export type PolicyMetadataDomainCreateModel = DomainModelCreate<PolicyMetadataDomainModel>
