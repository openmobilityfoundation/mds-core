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
import * as fs from 'fs'
import log from 'mds-logger'
import * as yargs from 'yargs'
import { Policy, Geography, ComplianceResponse, VehicleEvent, Device } from 'mds-types'
import { filterPolicies, processPolicy, filterEvents } from './mds-compliance-engine'
import { validateEvents, validateGeographies, validatePolicies } from './validators'

const args = yargs
  .options('geographies', {
    alias: 'g',
    demand: true,
    description: 'Path to geographies JSON',
    type: 'string'
  })
  .option('devices', {
    alias: 'd',
    demand: true,
    description: 'Path to devices JSON',
    type: 'string'
  })
  .options('events', {
    alias: 'e',
    demand: true,
    description: 'Path to events JSON',
    type: 'string'
  })
  .option('policies', {
    alias: 'p',
    demand: true,
    description: 'Path to policies JSON',
    type: 'string'
  }).argv

async function readJson(path: string): Promise<object> {
  return Promise.resolve(JSON.parse(fs.readFileSync(path).toString()))
}

async function main(): Promise<(ComplianceResponse | undefined)[]> {
  const geographies = (await readJson(args.geographies)) as Geography[]
  if (!geographies || !validateGeographies(geographies)) {
    await log.error('unable to read geographies')
    process.exit(1)
  }

  const policies = (await readJson(args.policies)) as Policy[]
  if (!policies || !validatePolicies(policies)) {
    await log.error('unable to read policies')
    process.exit(1)
  }

  // read events
  const events = (await readJson(args.events)) as VehicleEvent[]
  if (!events || !validateEvents(events)) {
    await log.error('unable to read events')
    process.exit(1)
  }
  const filteredEvents = filterEvents(events)

  // read devices
  const devices = ((await readJson(args.devices)) as Device[]).reduce((map: { [d: string]: Device }, device) => {
    return Object.assign(map, { [device.device_id]: device })
  }, {})
  // TODO Validate Devices
  if (!devices) {
    await log.error('unable to read devices')
    process.exit(1)
  }

  const filteredPolicies = filterPolicies(policies)
  // emit results
  return Promise.resolve(
    filteredPolicies.map((policy: Policy) => processPolicy(policy, filteredEvents, geographies, devices))
  )
}

main()
  .then(
    /* eslint-disable-next-line promise/always-return */
    result => {
      log.info(JSON.stringify(result, undefined, 2))
    },
    failure => {
      // TODO use payload response type instead of peering into body
      const reason = failure.slice && failure.slice(0, 2) === '{"' ? JSON.parse(failure) : failure
      if (reason.error_description) {
        log.info(`${reason.error_description} (${reason.error})`)
      } else if (reason.result) {
        log.info(reason.result)
      } else {
        log.info('failure:', reason)
      }
    }
  )
  /* eslint-disable-next-line promise/prefer-await-to-callbacks */
  .catch(async err => {
    await log.error('exception:', err.stack)
  })
