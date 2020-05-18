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
import { ServiceResult, ServiceError, ServiceException, isServiceError, ServiceManager } from '../index'
import { UnwrapServiceResult } from '../client'

describe('Tests Service Helpers', () => {
  it('ServiceResult', async () => {
    const { result } = ServiceResult('success')
    test.value(result).is('success')
  })

  it('ServiceError', async () => {
    const { error } = ServiceError({ type: 'ValidationError', message: 'Validation Error' })
    test.value(error.type).is('ValidationError')
    test.value(error.message).is('Validation Error')
    test.value(error.details).is(undefined)
  })

  it('ServiceException', async () => {
    const { error } = ServiceException('Validation Error')
    test.value(error.type).is('ServiceException')
    test.value(error.message).is('Validation Error')
    test.value(error.details).is(undefined)
  })

  it('ServiceException (with Error)', async () => {
    const { error } = ServiceException('Validation Error', Error('Error Message'))
    test.value(error.type).is('ServiceException')
    test.value(error.message).is('Validation Error')
    test.value(error.details).is('Error Message')
  })

  it('UnwrapServiceResult ServiceResult', async () => {
    try {
      const result = await UnwrapServiceResult(async () => ServiceResult('success'))()
      test.value(result).is('success')
    } catch (error) {
      test.value(error).is(null)
    }
  })

  it('Catch ServiceError', async () => {
    try {
      const result = await UnwrapServiceResult(async () =>
        ServiceError({ type: 'ValidationError', message: 'Validation Error' })
      )()
      test.value(result).is(null)
    } catch (error) {
      test.value(isServiceError(error)).is(true)
      if (isServiceError(error)) {
        test.value(error.type).is('ValidationError')
        test.value(error.message).is('Validation Error')
        test.value(error.details).is(undefined)
      }
    }
  })

  it('Custom ServiceError type', async () => {
    const { error } = ServiceError({ type: 'CustomError', message: 'Custom Error Message' })
    test.value(isServiceError(error, 'CustomError')).is(true)
  })

  it('ServiceError type guard', async () => {
    try {
      const error = Error('Error')
      test.value(isServiceError(ServiceException('Error', error).error)).is(true)
      throw error
    } catch (error) {
      test.value(isServiceError(error)).is(false)
      test.value(error instanceof Error).is(true)
    }
  })

  it('Test ServiceManager Controller', async () => {
    let started = false
    const controller = ServiceManager.controller({
      initialize: async () => {
        started = true
      },
      shutdown: async () => {
        started = false
      }
    })
    await controller.start()
    test.value(started).is(true)
    await controller.stop()
    test.value(started).is(false)
  })
})
