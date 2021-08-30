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
import { validatePolicyDomainModel } from '@mds-core/mds-policy-service'
import { validateEvents, validateGeographies } from '@mds-core/mds-schema-validators'
import { Device, Geography, Policy, VehicleEvent } from '@mds-core/mds-types'
import * as fs from 'fs'
import * as yargs from 'yargs'
import { ComplianceEngineResult } from './@types'
import { createComplianceSnapshot } from './engine'
import { filterEvents, generateDeviceMap, getSupersedingPolicies } from './engine/helpers'

async function readJson(path: string): Promise<object> {
  return Promise.resolve(JSON.parse(fs.readFileSync(path).toString()))
}

async function main(): Promise<(ComplianceEngineResult | undefined)[]> {
  const args = await yargs
    .options('provider_id', {
      alias: 'i',
      demand: true,
      description: 'provider_id',
      type: 'string'
    })
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
  const geographies = (await readJson(args.geographies)) as Geography[]
  if (!geographies || !validateGeographies(geographies)) {
    logger.error('unable to read geographies')
    process.exit(1)
  }

  const policies = (await readJson(args.policies)) as Policy[]
  if (!policies || !validatePolicyDomainModel(policies)) {
    logger.error('unable to read policies')
    process.exit(1)
  }

  // read events
  const events = (await readJson(args.events)) as VehicleEvent[]
  if (!events || !validateEvents(events)) {
    logger.error('unable to read events')
    process.exit(1)
  }
  const recentEvents = filterEvents(events)

  // read devices
  const devices = generateDeviceMap((await readJson(args.devices)) as Device[])
  // TODO Validate Devices
  if (!devices) {
    logger.error('unable to read devices')
    process.exit(1)
  }

  const supersedingPolicies = getSupersedingPolicies(policies)
  // emit results
  return Promise.all(
    supersedingPolicies.map(async (policy: Policy) => {
      return createComplianceSnapshot(args.provider_id, policy, geographies, recentEvents, devices)
    })
  )
}

main()
  /* eslint-disable-next-line promise/always-return */
  .then(result => {
    // eslint-disable-next-line no-console
    console.dir(result, { depth: null })
  })
  /* eslint-disable-next-line promise/prefer-await-to-callbacks */
  .catch(async err => {
    logger.error('exception:', err.stack)
  })
