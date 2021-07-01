/**
 * Copyright 2019 City of Los Angeles
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

import { Equal, FindOperator, In, IsNull } from 'typeorm'

export const PropertyValue = <TProperty extends string>(
  property: TProperty,
  value: unknown
): Partial<{ [P in TProperty]: FindOperator<unknown> }> => {
  return { [property]: Array.isArray(value) ? In(value) : Equal(value) } as Partial<
    { [P in TProperty]: FindOperator<unknown> }
  >
}

export const NullablePropertyValue = <TProperty extends string>(
  property: TProperty,
  value: unknown
): Partial<{ [P in TProperty]: FindOperator<unknown> }> => {
  return value === null
    ? ({ [property]: IsNull() } as Partial<{ [P in TProperty]: FindOperator<unknown> }>)
    : PropertyValue(property, value)
}

export const OptionalPropertyValue = <TProperty extends string>(
  filter: (property: TProperty, value: unknown) => Partial<{ [P in TProperty]: FindOperator<unknown> }>,
  property: TProperty,
  value: unknown
): Partial<{ [P in TProperty]: FindOperator<unknown> }> => (value === undefined ? {} : filter(property, value))
