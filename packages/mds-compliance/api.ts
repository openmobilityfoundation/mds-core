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
import cache from 'mds-cache'
import stream from 'mds-stream'
import db from 'mds-db'
import jwtDecode from 'jwt-decode'
import log from 'mds-logger'
import { isUUID, now, days, pathsFor } from 'mds-utils'
import { Policy, Geography, VehicleEvent, ComplianceResponse, Device, UUID } from 'mds'
import * as compliance_engine from './mds-compliance-engine'
import { ComplianceApiRequest } from './types'

function getAuth(req: ComplianceApiRequest): Partial<{ provider_id: string; scope: string }> {
  // Handle Auth from API Gateway
  const authorizer =
    req.apiGateway &&
    req.apiGateway.event &&
    req.apiGateway.event.requestContext &&
    req.apiGateway.event.requestContext.authorizer

  /* istanbul ignore next */
  if (authorizer) {
    const { provider_id, scope } = authorizer
    return { provider_id, scope }
  }

  // Handle Authorization Header when running standalone
  const decode = ([scheme, token]: string[]): Partial<{ provider_id: string; scope: string }> => {
    const decoders: { [scheme: string]: () => Partial<{ provider_id: string; scope: string }> } = {
      bearer: () => {
        const { provider_id, scope } = jwtDecode(token)
        return { provider_id, scope }
      },
      basic: () => {
        const [provider_id, scope] = Buffer.from(token, 'base64')
          .toString()
          .split('|')
        return { provider_id, scope }
      }
    }
    const decoder = decoders[scheme.toLowerCase()]
    return decoder ? decoder() : {}
  }

  return req.headers.authorization ? decode(req.headers.authorization.split(' ')) : {}
}

function api(app: express.Express): express.Express {
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      // verify presence of provider_id
      if (req.path.includes('/health')) {
        // all auth provided by API Gateway
      } else if (req.path !== '/') {
        const { provider_id, scope } = getAuth(req)

        // no test access without auth
        if (req.path.includes('/test/')) {
          if (!scope || !scope.includes('test:all')) {
            return res.status(403).send({
              result: `no test access without test:all scope (${scope})`
            })
          }
        }

        // no admin access without auth
        if (req.path.includes('/admin/')) {
          if (!scope || !scope.includes('admin:all')) {
            return res.status(403).send({
              result: `no admin access without admin:all scope (${scope})`
            })
          }
        }

        /* istanbul ignore next */
        if (!provider_id) {
          log.warn('Missing provider_id in', req.originalUrl)
          return res.status(400).send({
            result: 'missing provider_id'
          })
        }

        /* istanbul ignore next */
        if (!isUUID(provider_id)) {
          log.warn(req.originalUrl, 'invalid provider_id', provider_id)
          return res.status(400).send({
            result: `invalid provider_id ${provider_id} is not a UUID`
          })
        }
        res.locals.provider_id = provider_id
      }
    } catch (err) {
      /* istanbul ignore next */
      log.error(req.originalUrl, 'request validation fail:', err.stack)
    }
    next()
  })

  app.get(pathsFor('/test/initialize'), (req, res) => {
    Promise.all([db.initialize(), cache.initialize(), stream.initialize()])
      .then(
        kind => {
          res.send({
            result: `Database initialized (${kind})`
          })
        },
        err => {
          /* istanbul ignore next */
          log.error('initialize failed', err).then(() => {
            res.status(500).send('Server Error')
          })
        }
      )
      .catch(
        /* istanbul ignore next */
        err => {
          log.error('initialize exception', err).then(() => {
            res.status(500).send('Server Error')
          })
        }
      )
  })

  app.get(pathsFor('/snapshot/:policy_uuid'), async (req: express.Request, res: express.Response) => {
    if (
      !['5f7114d1-4091-46ee-b492-e55875f7de00', '45f37d69-73ca-4ca6-a461-e7283cffa01a'].includes(res.locals.provider_id)
    ) {
      res.status(401).send({ result: 'unauthorized access' })
    }
    /* istanbul ignore next */
    function fail(err: Error): void {
      log.error(err.stack || err).then(() => {
        res.status(500).send('server error')
      })
    }

    let start_date = now() - days(365)
    const { policy_uuid } = req.params
    const { provider_id } = req.query
    let { end_date } = req.query

    if (!isUUID(policy_uuid)) {
      res.status(400).send({ err: 'bad_param' })
    } else if (end_date) {
      end_date = parseInt(end_date)
      start_date = end_date - days(365)
      try {
        const policies = await db.readPolicies({ policy_id: policy_uuid, start_date, end_date })
        const geographies = await db.readGeographies()
        const deviceIdsWithProvider = await db.readDeviceIds(provider_id)
        const deviceIds = deviceIdsWithProvider.reduce((acc: UUID[], deviceId) => {
          return [...acc, deviceId.device_id]
        }, [])
        const devices = await cache.readDevices(deviceIds)
        const deviceMap = devices.reduce((map: { [d: string]: Device }, device) => {
          return Object.assign(map, { [device.device_id]: device })
        }, {})
        const events = await db.readHistoricalEvents({ provider_id, end_date })
        const filtered_policies: Policy[] = compliance_engine.filterPolicies(policies)
        const results: (ComplianceResponse | undefined)[] = filtered_policies.map((policy: Policy) =>
          compliance_engine.processPolicy(policy, events, geographies, deviceMap)
        )
        if (!results[0]) {
          res.status(400).send({ err: 'bad_param' })
        } else {
          res.status(200).send(results)
        }
      } catch (err) {
        fail(err)
      }
    } else {
      end_date = now() + days(365)
      db.readPolicies({ policy_id: policy_uuid, start_date, end_date })
        .then((policies: Policy[]) => {
          db.readGeographies()
            .then((geographies: Geography[]) => {
              db.readDeviceIds(provider_id)
                .then((deviceRecords: { device_id: UUID; provider_id: UUID }[]) => {
                  const total = deviceRecords.length
                  log.info(`read ${total} deviceIds in /vehicles`)
                  const deviceIdSubset = deviceRecords.map(
                    (record: { device_id: UUID; provider_id: UUID }) => record.device_id
                  )
                  cache
                    .readDevices(deviceIdSubset)
                    .then((devices: Device[]) => {
                      cache
                        .readEvents(deviceIdSubset)
                        .then((events: VehicleEvent[]) => {
                          /* istanbul ignore next */
                          const deviceMap: { [d: string]: Device } = devices.reduce(
                            (deviceMapAcc: { [d: string]: Device }, device: Device) => {
                              /* istanbul ignore next */
                              if (!device) {
                                throw new Error('device in DB but not in cache')
                              }
                              return Object.assign(deviceMapAcc, { [device.device_id]: device })
                            },
                            {}
                          )
                          log.info(`Policies: ${JSON.stringify(policies)}`)
                          const filtered_policies: Policy[] = compliance_engine.filterPolicies(policies)
                          const results: (ComplianceResponse | undefined)[] = filtered_policies.map((policy: Policy) =>
                            compliance_engine.processPolicy(policy, events, geographies, deviceMap)
                          )
                          if (results[0] === undefined) {
                            res.status(400).send({ err: 'bad_param' })
                          } else {
                            res.status(200).send(results)
                          }
                        }, fail)
                        .catch(fail)
                    }, fail)
                    .catch(fail)
                }, fail)
                .catch(fail)
            }, fail)
            .catch(fail)
        }, fail)
        .catch(fail)
    }
  })
  return app
}

export { api }
