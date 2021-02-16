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

import logger from '@mds-core/mds-logger'
import {
  hours,
  minutes,
  seconds,
  NotFoundError,
  ValidationError,
  ConflictError,
  UnsupportedTypeError
} from '@mds-core/mds-utils'
import { Nullable } from '@mds-core/mds-types'
import retry, { Options as RetryOptions } from 'async-retry'
import { ServiceResultType, ServiceErrorDescriptor, ServiceErrorType, ProcessController } from '../@types'

type ProcessMonitorOptions = Partial<
  Omit<RetryOptions, 'onRetry'> & {
    interval: number
    signals: NodeJS.Signals[]
  }
>

const ProcessMonitor = async (
  controller: ProcessController,
  options: ProcessMonitorOptions = {}
): Promise<ProcessController> => {
  const {
    interval = hours(1),
    signals = ['SIGINT', 'SIGTERM'],
    retries = 15,
    minTimeout = seconds(2),
    maxTimeout = minutes(2),
    ...retryOptions
  } = options

  const {
    env: { npm_package_name, npm_package_version, npm_package_git_commit }
  } = process

  const version = `${npm_package_name} v${npm_package_version} (${npm_package_git_commit ?? 'local'})`

  // Initialize the service
  try {
    await retry(
      async () => {
        logger.info(`Initializing process ${version}`)
        await controller.start()
      },
      {
        retries,
        minTimeout,
        maxTimeout,

        ...retryOptions,
        onRetry: (error, attempt) => {
          /* istanbul ignore next */
          logger.error(
            `Initializing process ${version} failed: ${error.message}, Retrying ${attempt} of ${retries}....`
          )
        }
      }
    )
  } catch (error) /* istanbul ignore next */ {
    logger.error(`Initializing process ${version} failed: ${error.message}, Exiting...`)
    await controller.stop()
    process.exit(1)
  }

  // Keep NodeJS process alive
  logger.info(`Monitoring process ${version} for ${signals.join(', ')}`)
  const timeout = setInterval(() => undefined, interval)

  const terminate = async (signal: NodeJS.Signals) => {
    clearInterval(timeout)
    logger.info(`Terminating process ${version} on ${signal}`)
    await controller.stop()
  }

  // Monitor process for signals
  signals.forEach(signal =>
    process.on(signal, async () => {
      await terminate(signal)
    })
  )

  return {
    start: async () => undefined,
    stop: async () => terminate('SIGUSR1')
  }
}

export const ProcessManager = (controller: ProcessController, options: ProcessMonitorOptions = {}) => ({
  monitor: () => {
    // eslint-reason disable in this one location until top-level await
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ProcessMonitor(controller, options)
  },
  controller: (): ProcessController => {
    let monitor: Nullable<ProcessController> = null
    return {
      start: async () => {
        if (!monitor) {
          monitor = await ProcessMonitor(controller, options)
        }
      },
      stop: async () => {
        if (monitor) {
          await monitor.stop()
          monitor = null
        }
      }
    }
  }
})

export type ProcessManager = ReturnType<typeof ProcessManager>

export const ServiceResult = <R>(result: R): ServiceResultType<R> => ({ error: null, result })

export const ServiceError = <E extends string>(
  error: Omit<ServiceErrorDescriptor<E>, 'isServiceError'>
): ServiceErrorType<E> => ({
  error: { isServiceError: true, ...error }
})

export const ServiceException = (message: string, error?: unknown) => {
  const details = (error instanceof Error && error.message) || undefined

  /* istanbul ignore if */
  if (error instanceof NotFoundError) {
    return ServiceError({ type: 'NotFoundError', message, details })
  }

  /* istanbul ignore if */
  if (error instanceof ValidationError) {
    return ServiceError({ type: 'ValidationError', message, details })
  }

  /* istanbul ignore if */
  if (error instanceof ConflictError) {
    return ServiceError({ type: 'ConflictError', message, details })
  }

  if (error instanceof UnsupportedTypeError) {
    return ServiceError({ type: 'UnsupportedTypeError', message, details })
  }

  return ServiceError({ type: 'ServiceException', message, details })
}
