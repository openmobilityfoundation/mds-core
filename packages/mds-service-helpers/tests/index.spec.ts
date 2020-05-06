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
import {
  ServiceResult,
  ServiceError,
  ServiceException,
  handleServiceResponse,
  getServiceResult,
  isServiceError,
  ServiceManager
} from '../index'

describe('Tests Service Helpers', () => {
  it('Handle ServiceResult', async () =>
    handleServiceResponse(
      ServiceResult('success'),
      error => test.value(error).is(null),
      result => test.value(result).is('success')
    ))

  it('Handle ServiceError', async () =>
    handleServiceResponse(
      ServiceError({ type: 'ValidationError', message: 'Validation Error' }),
      error => {
        test.value(error.type).is('ValidationError')
        test.value(error.message).is('Validation Error')
        test.value(error.details).is(undefined)
      },
      result => test.value(result).is(null)
    ))

  it('Handle ServiceException', async () =>
    handleServiceResponse(
      ServiceException('Validation Error'),
      error => {
        test.value(error.type).is('ServiceException')
        test.value(error.message).is('Validation Error')
        test.value(error.details).is(undefined)
      },
      result => test.value(result).is(null)
    ))

  it('Handle ServiceException (with Error)', async () =>
    handleServiceResponse(
      ServiceException('Validation Error', Error('Error Message')),
      error => {
        test.value(error.type).is('ServiceException')
        test.value(error.message).is('Validation Error')
        test.value(error.details).is('Error Message')
      },
      result => test.value(result).is(null)
    ))

  it('Get ServiceResult', async () => {
    try {
      const result = getServiceResult(ServiceResult('success'))
      test.value(result).is('success')
    } catch (error) {
      test.value(error).is(null)
    }
  })

  it('Catch ServiceError', async () => {
    try {
      const result = getServiceResult(ServiceError({ type: 'ValidationError', message: 'Validation Error' }))
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

  it('ServiceError type guard', async () => {
    try {
      const error = Error('Error')
      test.value(isServiceError(ServiceException('Error', error))).is(true)
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
