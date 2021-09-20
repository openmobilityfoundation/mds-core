export const Enum = <T extends string>(...keys: T[]) =>
  Object.freeze(
    keys.reduce((e, key) => {
      return { ...e, [key]: key }
    }, {}) as { [K in T]: K }
  )

export const isEnum = (enums: { [key: string]: string }, value: unknown) =>
  typeof value === 'string' && typeof enums === 'object' && enums[value] === value

export const DAYS_OF_WEEK = Enum('sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat')
export type DAY_OF_WEEK = keyof typeof DAYS_OF_WEEK
/**
 * @format uuid
 * @title A UUID used to uniquely identifty an object
 * @examples ["3c9604d6-b5ee-11e8-96f8-529269fb1459"]
 * @pattern ^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$
 */
export type UUID = string

export type Timestamp = number
export type TimestampInSeconds = number
export type Stringify<T> = { [P in keyof T]: string }
export type Nullable<T> = T | null
export type NullableProperties<T extends object> = {
  [P in keyof T]-?: T[P] extends null ? T[P] : Nullable<T[P]>
}
/**
 * Returns type with some properties set to NonNullable
 */
export type WithNonNullableKeys<T, P extends keyof T> = Omit<T, P> &
  {
    [K in keyof Pick<T, P>]: NonNullable<T[P]>
  }
export type SingleOrArray<T> = T | T[]
export type NullableKeys<T> = {
  [P in keyof T]: null extends T[P] ? P : never
}[keyof T]
export type Optional<T, P extends keyof T> = Omit<T, P> & Partial<Pick<T, P>>
export type NonEmptyArray<T> = [T, ...T[]]
export type RequiredKeys<T> = { [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K }[keyof T]
export type OptionalKeys<T> = { [K in keyof T]-?: {} extends { [P in K]: T[K] } ? K : never }[keyof T]
export type PickRequired<T> = Pick<T, RequiredKeys<T>>
export type PickOptional<T> = Pick<T, OptionalKeys<T>>
export type NullableOptional<T> = PickRequired<T> & NullableProperties<PickOptional<T>>

// eslint-reason recursive declarations require interfaces
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JsonArray extends Array<Json> {}

export interface JsonObject {
  [property: string]: Json
}

export type JsonValue = string | number | boolean | JsonArray | JsonObject

export type Json = Nullable<JsonValue>
// eslint-reason Function and constructor inference must use a single rest parameter of type 'any[]'
/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnyFunction<A = any> = (...args: any[]) => A
export type AnyConstructor<A = object> = new (...args: any[]) => A
