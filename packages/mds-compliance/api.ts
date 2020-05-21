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

import express from 'express'
import cache from '@mds-core/mds-agency-cache'
import db from '@mds-core/mds-db'
import logger from '@mds-core/mds-logger'
import {
  isUUID,
  now,
  pathsFor,
  getPolygon,
  pointInShape,
  isInStatesOrEvents,
  ServerError,
  NotFoundError,
  BadParamsError,
  AuthorizationError
} from '@mds-core/mds-utils'
import { Geography, Device, UUID, VehicleEvent } from '@mds-core/mds-types'
import { TEST1_PROVIDER_ID, TEST2_PROVIDER_ID, BLUE_SYSTEMS_PROVIDER_ID, providerName } from '@mds-core/mds-providers'
import { Geometry, FeatureCollection } from 'geojson'
import { parseRequest } from '@mds-core/mds-api-helpers'
import * as compliance_engine from './mds-compliance-engine'
import {
  ComplianceApiRequest,
  ComplianceApiResponse,
  ComplianceSnapshotApiResponse,
  ComplianceCountApiResponse
} from './types'
import { ComplianceApiVersionMiddleware } from './middleware'

const AllowedProviderIDs = [TEST1_PROVIDER_ID, TEST2_PROVIDER_ID, BLUE_SYSTEMS_PROVIDER_ID]

function api(app: express.Express): express.Express {
  app.use(ComplianceApiVersionMiddleware)
  app.use(async (req: ComplianceApiRequest, res: ComplianceApiResponse, next: express.NextFunction) => {
    try {
      // verify presence of provider_id
      if (!(req.path.includes('/health') || req.path === '/')) {
        if (res.locals.claims) {
          const { provider_id } = res.locals.claims

          /* istanbul ignore next */
          if (!provider_id) {
            logger.warn('Missing provider_id in', req.originalUrl)
            return res.status(400).send({ error: new BadParamsError('missing provider_id') })
          }

          /* istanbul ignore next */
          if (!isUUID(provider_id)) {
            logger.warn(req.originalUrl, 'invalid provider_id is not a UUID', provider_id)
            return res
              .status(400)
              .send({ error: new BadParamsError(`invalid provider_id ${provider_id} is not a UUID`) })
          }

          // stash provider_id
          res.locals.provider_id = provider_id

          logger.info(providerName(provider_id), req.method, req.originalUrl)
        } else {
          return res.status(401).send({ error: new AuthorizationError('Unauthorized') })
        }
      }
    } catch (err) {
      /* istanbul ignore next */
      logger.error(req.originalUrl, 'request validation fail:', err.stack)
    }
    next()
  })

  app.get(pathsFor('/snapshot/:policy_uuid'), async (req: ComplianceApiRequest, res: ComplianceSnapshotApiResponse) => {
    const { provider_id, version } = res.locals
    const { provider_id: queried_provider_id, timestamp } = {
      ...parseRequest(req).query('provider_id'),
      ...parseRequest(req, { parser: Number }).query('timestamp')
    }

    // default to now() if no timestamp supplied
    const query_date = timestamp || now()

    const { policy_uuid } = req.params

    if (!isUUID(policy_uuid)) {
      return res.status(400).send({ error: new BadParamsError('Bad policy UUID') })
    }

    try {
      const all_policies = await db.readActivePolicies(query_date)
      const policy = compliance_engine.filterPolicies(all_policies).find(p => {
        return p.policy_id === policy_uuid
      })
      if (!policy) {
        return res.status(404).send({ error: new NotFoundError('Policy not found') })
      }

      if (
        policy &&
        ((policy.provider_ids && policy.provider_ids.includes(provider_id)) ||
          !policy.provider_ids ||
          (AllowedProviderIDs.includes(provider_id) &&
            ((policy.provider_ids &&
              policy.provider_ids.length !== 0 &&
              queried_provider_id &&
              policy.provider_ids.includes(queried_provider_id)) ||
              !policy.provider_ids ||
              policy.provider_ids.length === 0)))
      ) {
        const target_provider_id = AllowedProviderIDs.includes(provider_id) ? queried_provider_id : provider_id
        if (
          compliance_engine
            .filterPolicies(all_policies)
            .map(p => p.policy_id)
            .includes(policy.policy_id)
        ) {
          const [geographies, deviceRecords] = await Promise.all([
            db.readGeographies() as Promise<Geography[]>,
            db.readDeviceIds(target_provider_id)
          ])
          const deviceIdSubset = deviceRecords.map((record: { device_id: UUID; provider_id: UUID }) => record.device_id)
          const devices = await cache.readDevices(deviceIdSubset)
          // if a timestamp was supplied, the data we want is probably old enough it's going to be in the db
          const events = timestamp
            ? await db.readHistoricalEvents({ provider_id: target_provider_id, end_date: timestamp })
            : await cache.readEvents(deviceIdSubset)

          const deviceMap = devices.reduce((map: { [d: string]: Device }, device) => {
            return device ? Object.assign(map, { [device.device_id]: device }) : map
          }, {})

          const filteredEvents = compliance_engine.filterEvents(events)
          const result = compliance_engine.processPolicy(policy, filteredEvents, geographies, deviceMap)
          if (result === undefined) {
            return res.status(400).send({ error: new BadParamsError('Unable to process compliance results') })
          }

          return res.status(200).send({ ...result, timestamp: query_date, version })
        }
      } else {
        return res.status(401).send({ error: new AuthorizationError() })
      }
    } catch (err) {
      return res.status(500).send({ error: new ServerError() })
    }
  })

  app.get(pathsFor('/count/:rule_id'), async (req: ComplianceApiRequest, res: ComplianceCountApiResponse) => {
    const { timestamp } = {
      ...parseRequest(req, { parser: Number }).query('timestamp')
    }
    const query_date = timestamp || now()
    if (!AllowedProviderIDs.includes(res.locals.provider_id)) {
      return res.status(401).send({ error: new AuthorizationError('Unauthorized') })
    }

    const { rule_id } = req.params
    try {
      const activePolicies = await db.readActivePolicies(query_date)
      const [policy] = activePolicies.filter(activePolicy => {
        const matches = activePolicy.rules.filter(policy_rule => policy_rule.rule_id === rule_id)
        return matches.length !== 0
      })
      if (!policy) {
        throw new NotFoundError('invalid rule_id')
      }
      const [rule] = policy.rules.filter(r => r.rule_id === rule_id)
      const geography_ids = rule.geographies.reduce((acc: UUID[], geo: UUID) => {
        return [...acc, geo]
      }, [])
      const geographies = (
        await Promise.all(
          geography_ids.reduce((acc: Promise<Geography>[], geography_id) => {
            const geography = db.readSingleGeography(geography_id)
            return [...acc, geography]
          }, [])
        )
      ).reduce((acc: Geography[], geos) => {
        return [...acc, geos]
      }, [])

      const polys = geographies.reduce((acc: (Geometry | FeatureCollection)[], geography) => {
        return [...acc, getPolygon(geographies, geography.geography_id)]
      }, [])

      const events = timestamp ? await db.readHistoricalEvents({ end_date: timestamp }) : await cache.readAllEvents()

      // https://stackoverflow.com/a/51577579 to remove nulls in typesafe way
      const filteredVehicleEvents = events.filter(
        (event): event is VehicleEvent => event !== null && isInStatesOrEvents(rule, event)
      )
      const filteredEvents = compliance_engine.filterEvents(filteredVehicleEvents)

      const count = filteredEvents.reduce((count_acc, event) => {
        return (
          count_acc +
          polys.reduce((poly_acc, poly) => {
            if (event.telemetry && pointInShape(event.telemetry.gps, poly)) {
              return poly_acc + 1
            }
            return poly_acc
          }, 0)
        )
      }, 0)

      const { version } = res.locals
      return res.status(200).send({ policy, count, timestamp: query_date, version })
    } catch (error) {
      await logger.error(error.stack)
      if (error instanceof NotFoundError) {
        return res.status(404).send({ error })
      }
      return res.status(500).send({ error: new ServerError('An internal server error has occurred and been logged') })
    }
  })
  return app
}

export { api }
