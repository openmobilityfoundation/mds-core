import { ACCESSIBILITY_OPTION, MODALITY } from './device'
import { MICRO_MOBILITY_VEHICLE_EVENT, TAXI_VEHICLE_EVENT, TNC_VEHICLE_EVENT } from './event'
import { SERVICE_TYPE, TRANSACTION_TYPE } from './trip'
import { DAY_OF_WEEK, Enum, Nullable, Timestamp, UUID } from './utils'
import { MICRO_MOBILITY_VEHICLE_STATE, TAXI_VEHICLE_STATE, TNC_VEHICLE_STATE } from './vehicle/vehicle_states'
import { VEHICLE_TYPE } from './vehicle/vehicle_types'

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

/**
 * @deprecated Use PolicyDomainModel instead.
 */
export type Policy<R extends Rule = Rule> = {
  name: string
  description: string
  provider_ids?: UUID[]
  published_date?: Timestamp
  policy_id: UUID
  start_date: Timestamp
  end_date: Timestamp | null
  prev_policies: UUID[] | null
  rules: R[]
  publish_date?: Timestamp
}

export type StatesToEvents =
  | Partial<MicroMobilityStatesToEvents>
  | Partial<TNCStatesToEvents>
  | Partial<TaxiStatesToEvents>

export const RATE_RECURRENCE_VALUES = ['once', 'each_time_unit', 'per_complete_time_unit'] as const
export type RATE_RECURRENCE = typeof RATE_RECURRENCE_VALUES[number]

export type CountPolicy = Policy<CountRule>
export type SpeedPolicy = Policy<SpeedRule>
export type TimePolicy = Policy<TimeRule>
export interface RatePolicy extends Policy<RateRule> {
  currency: string
  rules: RateRule[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PolicyMetadata<M extends {} = Record<string, any>> {
  policy_id: UUID
  policy_metadata: M
}
