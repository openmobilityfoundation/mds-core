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

import logger from '@mds-core/mds-logger'
import { hours } from '@mds-core/mds-utils'
import { Nullable } from '@mds-core/mds-types'
import { ServiceProvider } from './@types'

type ProcessMonitorOptions = Partial<{
  interval: number
  signals: NodeJS.Signals[]
}>

type ProcessMonitor = {
  stop: () => Promise<void>
}

const ServiceMonitor = async <TServiceInterface>(
  service: ServiceProvider<TServiceInterface>,
  options: ProcessMonitorOptions = {}
): Promise<ProcessMonitor> => {
  const { interval = hours(1), signals = ['SIGINT', 'SIGTERM'] } = options

  const {
    env: { npm_package_name, npm_package_version, npm_package_git_commit }
  } = process

  const version = `${npm_package_name} v${npm_package_version} (${npm_package_git_commit ?? 'local'})`

  logger.info(`Initializing service ${version}`)

  // Initialize the service
  await service.initialize()

  // Keep NodeJS process alive
  logger.info(`Monitoring service ${version} for ${signals.join(', ')}`)
  const timeout = setInterval(() => {
    logger.info(`Monitoring service ${version} for ${signals.join(', ')}`)
  }, interval)

  const shutdown = async (signal: NodeJS.Signals) => {
    clearInterval(timeout)
    logger.info(`Terminating service ${version} on ${signal}`)
    await service.shutdown()
  }

  // Monitor process for signals
  signals.forEach(signal =>
    process.on(signal, async () => {
      await shutdown(signal)
    })
  )

  return { stop: async () => shutdown('SIGUSR1') }
}

export const ServiceManager = {
  run: <TServiceInterface>(service: ServiceProvider<TServiceInterface>, options: ProcessMonitorOptions = {}) => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ServiceMonitor(service, options)
  },
  controller: <TServiceInterface>(service: ServiceProvider<TServiceInterface>, options: ProcessMonitorOptions = {}) => {
    let monitor: Nullable<ProcessMonitor> = null
    return {
      start: async () => {
        if (!monitor) {
          monitor = await ServiceMonitor(service, options)
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
}
