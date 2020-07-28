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
  pathPrefix,
  getPolygon,
  pointInShape,
  isInStatesOrEvents,
  ServerError,
  NotFoundError,
  BadParamsError,
  AuthorizationError
} from '@mds-core/mds-utils'
import { Geography, UUID, VehicleEvent } from '@mds-core/mds-types'
import { providerName } from '@mds-core/mds-providers'
import { Geometry, FeatureCollection } from 'geojson'
import { parseRequest } from '@mds-core/mds-api-helpers'
import * as compliance_engine from './mds-compliance-engine'
import {
  ComplianceApiRequest,
  ComplianceApiResponse,
  ComplianceApiSnapshotResponse,
  ComplianceApiCountResponse,
  ComplianceApiSnapshotRequest,
  ComplianceApiCountRequest
} from './types'
import { ComplianceApiVersionMiddleware } from './middleware'
import { AllowedProviderIDs } from './constants'
import { clientCanViewPolicyCompliance, getComplianceInputs } from './helpers'

function api(app: express.Express): express.Express {
  app.use(ComplianceApiVersionMiddleware)
  app.use(async (req: ComplianceApiRequest, res: ComplianceApiResponse, next: express.NextFunction) => {
    try {
      // verify presence of provider_id
      if (!req.path.includes('/health')) {
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

  app.get(
    pathPrefix('/snapshot/:policy_uuid'),
    async (req: ComplianceApiSnapshotRequest, res: ComplianceApiSnapshotResponse) => {
      const { provider_id, version } = res.locals
      const {
        provider_id: [queried_provider_id],
        timestamp: [timestamp]
      } = {
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
        /* Get all published policies that fulfill the conditions start_date <= query_date,
         * and end_date >= query_date.
         */
        const all_policies = await db.readActivePolicies(query_date)
        const policy = compliance_engine.getSupersedingPolicies(all_policies).find(p => {
          return p.policy_id === policy_uuid
        })
        if (!policy) {
          return res.status(404).send({ error: new NotFoundError('Policy not found') })
        }

        if (clientCanViewPolicyCompliance(provider_id, queried_provider_id, policy)) {
          /* If the client is one of the allowed providers, they can query for an arbitrary provider's vehicles. Otherwise, they may
           only see compliance results for their own devices.
           */
          const target_provider_id = AllowedProviderIDs.includes(provider_id) ? queried_provider_id : provider_id
          if (
            // Check to see if the policy for which a snapshot is desired has been superseded or not.
            compliance_engine
              .getSupersedingPolicies(all_policies)
              .map(p => p.policy_id)
              .includes(policy.policy_id)
          ) {
            const { filteredEvents, geographies, deviceMap } = await getComplianceInputs(target_provider_id, timestamp)
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
    }
  )

  app.get(pathPrefix('/count/:rule_id'), async (req: ComplianceApiCountRequest, res: ComplianceApiCountResponse) => {
    const {
      timestamp: [timestamp]
    } = {
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
      const filteredEvents = compliance_engine.getRecentEvents(filteredVehicleEvents)

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
