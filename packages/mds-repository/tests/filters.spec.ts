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

import test from 'unit.js'
import { OptionalPropertyValue, NullablePropertyValue, PropertyValue } from '../filters'

describe('Test Filters', () => {
  it('Test Scalar PropertyValue', async () => {
    const filter = PropertyValue('property', 'scalar')
    test.object(filter).hasProperty('property')
    test.object(filter.property).hasProperty('_type', 'equal')
    test.object(filter.property).hasProperty('value', 'scalar')
  })

  it('Test Array PropertyValue', async () => {
    const filter = PropertyValue('property', ['array'])
    test.object(filter).hasProperty('property')
    test.object(filter.property).hasProperty('_type', 'in')
    test.object(filter.property).hasProperty('value')
    test.value(filter.property?.value).is(['array'])
  })

  it('Test NullablePropertyValue (null)', async () => {
    const filter = NullablePropertyValue('property', null)
    test.object(filter).hasProperty('property')
    test.object(filter.property).hasProperty('_type', 'isNull')
  })

  it('Test NullablePropertyValue (value)', async () => {
    const filter = NullablePropertyValue('property', 'scalar')
    test.object(filter).hasProperty('property')
    test.object(filter.property).hasProperty('_type', 'equal')
    test.object(filter.property).hasProperty('value', 'scalar')
  })

  it('Test OptionalPropertyValue (undefined)', async () => {
    const filter = OptionalPropertyValue(NullablePropertyValue, 'property', undefined)
    test.value(filter).is({})
  })

  it('Test OptionalPropertyValue (null)', async () => {
    const filter = OptionalPropertyValue(NullablePropertyValue, 'property', null)
    test.object(filter).hasProperty('property')
    test.object(filter.property).hasProperty('_type', 'isNull')
  })
})
