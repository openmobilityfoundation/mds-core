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

import { isStringArray } from '@mds-core/mds-utils'

/** A single-value (string) parser. Useful for standard transformations, e.g.:
 * - Number
 * - String
 * - JSON.parse
 */
export type SingleParser<T> = (value: string) => T

/** A multi-value (array) parser. Useful for complex transformations, e.g.:
 * - Input cleansing: (xs) => { xs.map(Number).filter(x => x > 0) }
 */
export type ListParser<T> = (value: string[]) => T[]

export type ParseObjectPropertiesOptionsSingle<T> = Partial<{
  parser: SingleParser<T>
}>

export type ParseObjectPropertiesOptionsList<T> = Partial<{
  parser: ListParser<T>
}>

export type ParseObjectPropertiesOptions<T> = Partial<{
  singleParser: SingleParser<T>
  listParser: ListParser<T>
}>

/**
 * Takes a given object, and applies transformations in a type-safe way.
 * Intended primarily for use with Express Query/Param objects, to allow
 * easy transformation and usage via destructuring in API code.
 * @constructor
 * @param obj - The object to parse
 * @param options - Defines the object parser options.
 */
export const parseObjectPropertiesSingle = <T = string>(
  obj: { [k: string]: unknown },
  { parser }: ParseObjectPropertiesOptionsSingle<T> = {}
) => {
  return {
    keys: <TKey extends string>(first: TKey, ...rest: TKey[]) =>
      [first, ...rest]
        .map(key => ({ key, value: obj[key] }))
        .reduce((params, { key, value }) => {
          if (typeof value === 'string') {
            if (parser) {
              return { ...params, [key]: parser(value) }
            }
            return { ...params, [key]: value }
          }
          if (isStringArray(value)) {
            const [firstVal] = value
            if (parser) {
              return { ...params, [key]: parser(firstVal) }
            }
            return { ...params, [key]: firstVal }
          }
          return { ...params, [key]: undefined }
        }, {}) as { [P in TKey]: T | undefined }
  }
}

/**
 * Takes a given object, and applies transformations in a type-safe way.
 * Intended primarily for use with Express Query/Param objects, to allow
 * easy transformation and usage via destructuring in API code.
 * @constructor
 * @param obj - The object to parse
 * @param options - Defines the object parser options.
 */
export const parseObjectPropertiesList = <T = string>(
  obj: { [k: string]: unknown },
  { parser }: ParseObjectPropertiesOptionsList<T> = {}
) => {
  return {
    keys: <TKey extends string>(first: TKey, ...rest: TKey[]) =>
      [first, ...rest]
        .map(key => ({ key, value: obj[key] }))
        .reduce((params, { key, value }) => {
          if (typeof value === 'string') {
            if (parser) {
              return { ...params, [key]: parser([value]) }
            }
            return { ...params, [key]: [value] }
          }
          if (isStringArray(value)) {
            if (parser) {
              return { ...params, [key]: parser(value) }
            }
            return { ...params, [key]: value }
          }
          return { ...params, [key]: undefined }
        }, {}) as { [P in TKey]: T[] | undefined }
  }
}
