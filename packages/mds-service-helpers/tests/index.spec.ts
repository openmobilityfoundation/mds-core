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
import { ServiceResult, ServiceError, ServiceException } from '../index'

describe('Tests Service Helpers', () => {
  it('Test ServiceResult', done => {
    const [failure, result] = ServiceResult('success')
    test.value(failure).is(null)
    test.value(result).is('success')
    done()
  })

  it('Test ServiceError', done => {
    const [error, result] = ServiceError({ type: 'ValidationError', message: 'Validation Error' })
    test.value(result).is(null)
    test.value(error).isNot(null)
    test.value(error?.type).is('ValidationError')
    test.value(error?.message).is('Validation Error')
    test.value(error?.details).is(undefined)
    done()
  })

  it('Test ServiceException', done => {
    const exception = Error('Error Message')
    const [error, result] = ServiceException('Validation Error', exception)
    test.value(result).is(null)
    test.value(error).isNot(null)
    test.value(error?.type).is('ServiceException')
    test.value(error?.message).is('Validation Error')
    test.value(error?.details).is(exception.message)
    done()
  })
})
