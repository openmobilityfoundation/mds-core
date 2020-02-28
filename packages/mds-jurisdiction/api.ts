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

import express from 'express'
import {
  pathsFor,
  ServerError,
  NotFoundError,
  ValidationError,
  ConflictError,
  AuthorizationError
} from '@mds-core/mds-utils'
import { checkAccess, ApiVersionMiddleware } from '@mds-core/mds-api-server'
import { JurisdictionService } from '@mds-core/mds-jurisdiction-service'
import { Jurisdiction } from '@mds-core/mds-types'
import {
  JurisdictionApiGetJurisdictionsRequest,
  JurisdictionApiGetJurisdictionsResponse,
  JurisdictionApiCreateJurisdictionRequest,
  JurisdictionApiCreateJurisdictionResponse,
  JurisdictionApiGetJurisdictionResponse,
  JurisdictionApiGetJurisdictionRequest,
  JurisdictionApiResponse,
  JURISDICTION_API_DEFAULT_VERSION,
  JURISDICTION_API_SUPPORTED_VERSIONS
} from './types'

const UnexpectedServiceError = (error: ServerError | null) =>
  error instanceof ServerError ? error : new ServerError('Unexected Service Error', { error })

const HasJurisdictionClaim = <TBody extends {}>(res: JurisdictionApiResponse<TBody>) => (
  jurisdiction: Jurisdiction
): boolean =>
  res.locals.scopes.includes('jurisdictions:read') ||
  (res.locals.claims?.jurisdictions?.split(' ') ?? []).includes(jurisdiction.agency_key)

function api(app: express.Express): express.Express {
  app.use(
    ApiVersionMiddleware(
      'application/vnd.mds.jurisdiction+json',
      JURISDICTION_API_SUPPORTED_VERSIONS
    ).withDefaultVersion(JURISDICTION_API_DEFAULT_VERSION)
  )
  app.get(
    pathsFor('/jurisdictions'),
    checkAccess(scopes => scopes.includes('jurisdictions:read') || scopes.includes('jurisdictions:read:claim')),
    async (req: JurisdictionApiGetJurisdictionsRequest, res: JurisdictionApiGetJurisdictionsResponse) => {
      const { effective } = req.query

      const [error, jurisdictions] = await JurisdictionService.getAllJurisdictions({
        effective: effective ? Number(effective) : undefined
      })

      // Handle result
      if (jurisdictions) {
        return res.status(200).send({
          version: res.locals.version,
          jurisdictions: jurisdictions.filter(HasJurisdictionClaim(res))
        })
      }

      // Handle errors
      return res.status(500).send({ error: UnexpectedServiceError(error) })
    }
  )

  app.get(
    pathsFor('/jurisdictions/:jurisdiction_id'),
    checkAccess(scopes => scopes.includes('jurisdictions:read') || scopes.includes('jurisdictions:read:claim')),
    async (req: JurisdictionApiGetJurisdictionRequest, res: JurisdictionApiGetJurisdictionResponse) => {
      const { effective } = req.query
      const { jurisdiction_id } = req.params

      const [error, jurisdiction] = await JurisdictionService.getOneJurisdiction(jurisdiction_id, {
        effective: effective ? Number(effective) : undefined
      })

      // Handle result
      if (jurisdiction) {
        return HasJurisdictionClaim(res)(jurisdiction)
          ? res.status(200).send({
              version: res.locals.version,
              jurisdiction
            })
          : res.status(403).send({ error: new AuthorizationError('Access Denied', { jurisdiction_id }) })
      }

      // Handle errors
      if (error instanceof NotFoundError) {
        return res.status(404).send({ error })
      }

      return res.status(500).send({ error: UnexpectedServiceError(error) })
    }
  )

  app.post(
    pathsFor('/jurisdictions'),
    checkAccess(scopes => scopes.includes('jurisdictions:write')),
    async (req: JurisdictionApiCreateJurisdictionRequest, res: JurisdictionApiCreateJurisdictionResponse) => {
      const [error, jurisdictions] = await JurisdictionService.createJurisdictions(
        Array.isArray(req.body) ? req.body : [req.body]
      )

      // Handle result
      if (jurisdictions) {
        return Array.isArray(req.body)
          ? res.status(201).send({ version: res.locals.version, jurisdictions })
          : res.status(201).send({ version: res.locals.version, jurisdiction: jurisdictions[0] })
      }

      // Handle errors
      if (error instanceof ValidationError) {
        return res.status(400).send({ error })
      }
      if (error instanceof ConflictError) {
        return res.status(409).send({ error })
      }

      return res.status(500).send({ error: UnexpectedServiceError(error) })
    }
  )

  return app
}

export { api }
