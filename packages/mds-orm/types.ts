import { InsertResult, UpdateResult } from 'typeorm'

export type Nullable<T> = T | null

// eslint-reason recursive declarations require interfaces
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JsonArray extends Array<Json> {}

export interface JsonObject {
  [property: string]: Json
}

export type JsonValue = string | number | boolean | JsonArray | JsonObject

export type Json = Nullable<JsonValue>

export interface InsertReturning<T> extends InsertResult {
  raw: T[]
}

export interface UpdateReturning<T> extends UpdateResult {
  raw: T[]
}
