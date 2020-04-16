/*
    Copyright 2019-2020 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import test from 'unit.js'
import { FindOperator } from 'typeorm'
import { entityPropertyFilter } from '../utils'
import { RepositoryError } from '../exceptions'

describe('Test Repository Utilities', () => {
  it('RepositoryError', done => {
    const error = RepositoryError.create(Error('Some Caught Error'))
    test.value(RepositoryError.is.repositoryError(error)).is(true)
    test.value(error.code).is(undefined)
    done()
  })

  it('entityPropertyFilter', done => {
    test
      .value(
        entityPropertyFilter<{ property: number }, 'property'>('property', [1, 2]).property instanceof FindOperator
      )
      .is(true)
    test
      .value(
        entityPropertyFilter<{ property: number }, 'property'>('property', [1])
      )
      .is({ property: 1 })
    test.value(entityPropertyFilter<{ property: number }, 'property'>('property', [])).is({})
    test.value(entityPropertyFilter<{ property: number }, 'property'>('property', 1)).is({ property: 1 })
    test.value(entityPropertyFilter<{ property?: number }, 'property'>('property', undefined)).is({})
    done()
  })
})
