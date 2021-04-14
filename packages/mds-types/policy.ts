import { DAY_OF_WEEK, Enum, Timestamp, UUID } from './utils'
import { ACCESSIBILITY_OPTION, MODALITY } from './device'
import { MICRO_MOBILITY_VEHICLE_EVENT, TAXI_VEHICLE_EVENT, TNC_VEHICLE_EVENT } from './event'
import { MICRO_MOBILITY_VEHICLE_STATE, TAXI_VEHICLE_STATE, TNC_VEHICLE_STATE } from './vehicle/vehicle_states'

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

export interface BaseRule<StatesToEventsMap extends GenericStatesToEvents, RuleType extends RULE_TYPE = RULE_TYPE> {
  accessibility_options?: ACCESSIBILITY_OPTION[] | null
  days?: DAY_OF_WEEK[] | null
  end_time?: string | null
  geographies: UUID[]
  maximum?: number | null
  /* eslint-reason TODO: message types haven't been defined well yet */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  messages?: PolicyMessage
  minimum?: number | null
  modality?: MODALITY
  name: string
  rule_id: UUID
  rule_type: RuleType
  rule_units?: string
  start_time?: string | null
  states: StatesToEventsMap | null
  value_url?: URL | null
  vehicle_types?: string[] | null
}

export interface MicroMobilityRule<RuleType extends 'count' | 'speed' | 'time' | 'user'>
  extends BaseRule<Partial<MicroMobilityStatesToEvents>, RuleType> {
  modality?: 'micromobility'
}

export interface TaxiRule<RuleType extends 'count' | 'speed' | 'time' | 'user'>
  extends BaseRule<Partial<TaxiStatesToEvents>, RuleType> {
  modality: 'taxi'
}

export interface TNCRule<RuleType extends 'count' | 'speed' | 'time' | 'user'>
  extends BaseRule<Partial<TNCStatesToEvents>, RuleType> {
  modality: 'tnc'
}

export type ModalityRule<RuleType extends 'count' | 'speed' | 'time' | 'user'> =
  | MicroMobilityRule<RuleType>
  | TaxiRule<RuleType>
  | TNCRule<RuleType>

export type CountRule = ModalityRule<'count'>

export type TimeRule = ModalityRule<'time'> & {
  rule_units: 'minutes' | 'hours'
}

export type SpeedRule = ModalityRule<'speed'> & {
  rule_units: 'kph' | 'mph'
}

export type UserRule = ModalityRule<'user'>

export type Rule = CountRule | TimeRule | SpeedRule | UserRule

export type BasePolicy<
  StatesToEventsMap extends GenericStatesToEvents,
  RuleType extends RULE_TYPE,
  R extends BaseRule<StatesToEventsMap, RuleType>
> = {
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

export type ModalityStatesToEvents =
  | Partial<MicroMobilityStatesToEvents>
  | Partial<TNCStatesToEvents>
  | Partial<TaxiStatesToEvents>

export type ModalityPolicy = BasePolicy<ModalityStatesToEvents, RULE_TYPE, ModalityRule<Exclude<RULE_TYPE, 'rate'>>>

export type PolicyTypeInfo<
  StatesToEventsMap extends GenericStatesToEvents = GenericStatesToEvents,
  RuleType extends RULE_TYPE = RULE_TYPE,
  Rule extends BaseRule<StatesToEventsMap, RuleType> = BaseRule<StatesToEventsMap, RuleType>
> = {
  StatesToEventMap: StatesToEventsMap
  RuleType: RuleType
  Rule: Rule
  Policy: BasePolicy<StatesToEventsMap, RuleType, Rule>
}

export type ModalityPolicyTypeInfo = PolicyTypeInfo<
  ModalityStatesToEvents,
  Exclude<RULE_TYPE, 'rate'>,
  ModalityRule<Exclude<RULE_TYPE, 'rate'>>
>

export type ModalityCountPolicy = BasePolicy<ModalityStatesToEvents, 'count', CountRule>
export type ModalitySpeedPolicy = BasePolicy<ModalityStatesToEvents, 'speed', SpeedRule>
export type ModalityTimePolicy = BasePolicy<ModalityStatesToEvents, 'time', TimeRule>

export const RATE_RECURRENCE_VALUES = ['once', 'each_time_unit', 'per_complete_time_unit'] as const
export type RATE_RECURRENCE = typeof RATE_RECURRENCE_VALUES[number]

/**
 * A RateRule is a rule of any type that has a `rate_amount` property.
 * @alpha Out-of-spec for MDS 0.4.1
 */
export type RateRule<StatesToEventMap extends GenericStatesToEvents> = BaseRule<StatesToEventMap, 'rate'> & {
  rate_amount: number
  rate_recurrence: RATE_RECURRENCE
}

/**
 * A RatePolicy is a policy whose rules are RateRules.
 * @alpha Out-of-spec for MDS 0.4.1
 */
export interface RatePolicy<StatesToEventMap extends GenericStatesToEvents>
  extends BasePolicy<StatesToEventMap, 'rate', RateRule<StatesToEventMap>> {
  currency: string
  rules: RateRule<StatesToEventMap>[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PolicyMetadata<M extends {} = Record<string, any>> {
  policy_id: UUID
  policy_metadata: M
}
