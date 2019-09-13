/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable promise/prefer-await-to-callbacks */
/*
    Copyright 2019 City of Los Angeles.

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
import { validateScopes } from '../index'

type TestAccessScopes = 'scope:1' | 'scope:2' | 'scope:3' | 'scope:4'

describe('Testing API Scope Enforcement', () => {
  it('Verifies Single Scope', done => {
    test.value(validateScopes<TestAccessScopes>(check => check('scope:1'), ['scope:1'])).is(true)
    test.value(validateScopes<TestAccessScopes>(check => check('scope:2'), ['scope:1'])).is(false)
    done()
  })

  it('Verifies All Scopes', done => {
    test
      .value(validateScopes<TestAccessScopes>(check => check('scope:1') && check('scope:2'), ['scope:1', 'scope:2']))
      .is(true)
    test.value(validateScopes<TestAccessScopes>(check => check('scope:1') && check('scope:2'), ['scope:1'])).is(false)
    done()
  })

  it('Verifies Any Scope', done => {
    test.value(validateScopes<TestAccessScopes>(check => check('scope:1') || check('scope:2'), ['scope:1'])).is(true)
    test.value(validateScopes<TestAccessScopes>(check => check('scope:1') || check('scope:2'), ['scope:3'])).is(false)
    done()
  })

  it('Verifies Scope Expressions', done => {
    test
      .value(
        validateScopes<TestAccessScopes>(
          check => (check('scope:1') || check('scope:2')) && check('scope:3') && check('scope:4'),
          ['scope:1', 'scope:3', 'scope:4']
        )
      )
      .is(true)

    test
      .value(
        validateScopes<TestAccessScopes>(
          check => (check('scope:1') || check('scope:2')) && check('scope:3') && check('scope:4'),
          ['scope:3', 'scope:4']
        )
      )
      .is(false)

    test
      .value(
        validateScopes<TestAccessScopes>(
          check => (check('scope:1') || check('scope:2')) && check('scope:3') && check('scope:4'),
          ['scope:1', 'scope:3']
        )
      )
      .is(false)

    test
      .value(
        validateScopes<TestAccessScopes>(
          check => check('scope:1') || check('scope:2') || (check('scope:3') && check('scope:4')),
          ['scope:1', 'scope:3', 'scope:4']
        )
      )
      .is(true)

    test
      .value(
        validateScopes<TestAccessScopes>(
          check => check('scope:1') || check('scope:2') || (check('scope:3') && check('scope:4')),
          ['scope:3', 'scope:4']
        )
      )
      .is(true)

    test
      .value(
        validateScopes<TestAccessScopes>(
          check => check('scope:1') || check('scope:2') || (check('scope:3') && check('scope:4')),
          ['scope:2']
        )
      )
      .is(true)

    test
      .value(
        validateScopes<TestAccessScopes>(
          check => check('scope:1') || check('scope:2') || (check('scope:3') && check('scope:4')),
          ['scope:3']
        )
      )
      .is(false)

    done()
  })
})
