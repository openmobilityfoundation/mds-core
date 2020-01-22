export type AsEntity<T> = {
  [P in keyof Required<T>]: Pick<T, P> extends Required<Pick<T, P>> ? T[P] : Exclude<T[P], undefined> | null
}

export type Nullable<T> = T | null

// eslint-reason recursive declarations require interfaces
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JsonArray extends Array<Nullable<Json>> {}

export interface JsonObject {
  [property: string]: Nullable<Json>
}

export type Json = string | number | boolean | JsonArray | JsonObject
