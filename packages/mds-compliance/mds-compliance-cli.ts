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

import * as fs from 'fs'
import logger from '@mds-core/mds-logger'
import * as yargs from 'yargs'
import { Policy, Geography, VehicleEvent, Device } from '@mds-core/mds-types'
import { validateEvents, validateGeographies, validatePolicies } from '@mds-core/mds-schema-validators'
import { ComplianceResponse } from './types'
import { getSupersedingPolicies, processPolicy, getRecentEvents } from './mds-compliance-engine'

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
    logger.error('unable to read geographies')
    process.exit(1)
  }

  const policies = (await readJson(args.policies)) as Policy[]
  if (!policies || !validatePolicies(policies)) {
    logger.error('unable to read policies')
    process.exit(1)
  }

  // read events
  const events = (await readJson(args.events)) as VehicleEvent[]
  if (!events || !validateEvents(events)) {
    logger.error('unable to read events')
    process.exit(1)
  }
  const recentEvents = getRecentEvents(events)

  // read devices
  const devices = ((await readJson(args.devices)) as Device[]).reduce((map: { [d: string]: Device }, device) => {
    return Object.assign(map, { [device.device_id]: device })
  }, {})
  // TODO Validate Devices
  if (!devices) {
    logger.error('unable to read devices')
    process.exit(1)
  }

  const supersedingPolicies = getSupersedingPolicies(policies)
  // emit results
  return Promise.resolve(
    supersedingPolicies.map((policy: Policy) => processPolicy(policy, recentEvents, geographies, devices))
  )
}

main()
  .then(
    /* eslint-disable-next-line promise/always-return */
    result => {
      logger.info(JSON.stringify(result, undefined, 2))
    },
    failure => {
      // TODO use payload response type instead of peering into body
      const reason = failure.slice && failure.slice(0, 2) === '{"' ? JSON.parse(failure) : failure
      if (reason.error_description) {
        logger.info(`${reason.error_description} (${reason.error})`)
      } else if (reason.result) {
        logger.info(reason.result)
      } else {
        logger.info('failure:', reason)
      }
    }
  )
  /* eslint-disable-next-line promise/prefer-await-to-callbacks */
  .catch(async err => {
    logger.error('exception:', err.stack)
  })
