import express, { NextFunction } from 'express'
import db from '@mds-core/mds-db'

import { pathPrefix, ServerError, NotFoundError, InsufficientPermissionsError } from '@mds-core/mds-utils'
import logger from '@mds-core/mds-logger'

import { checkAccess, AccessTokenScopeValidator, ApiResponse, ApiRequest } from '@mds-core/mds-api-server'
import { GeographyApiVersionMiddleware } from './middleware'
import {
  GeographyApiAccessTokenScopes,
  GeographyApiGetGeographyResponse,
  GeographyApiGetGeographiesResponse,
  GeographyApiGetGeographyRequest,
  GeographyApiGetGeographiesRequest
} from './types'

const checkGeographyApiAccess = (validator: AccessTokenScopeValidator<GeographyApiAccessTokenScopes>) =>
  checkAccess(validator)

function api(app: express.Express): express.Express {
  app.use(GeographyApiVersionMiddleware)

  app.get(
    pathPrefix('/geographies/:geography_id'),
    checkGeographyApiAccess(scopes => {
      return scopes.includes('geographies:read:published') || scopes.includes('geographies:read:unpublished')
    }),
    async (req: GeographyApiGetGeographyRequest, res: GeographyApiGetGeographyResponse, next: express.NextFunction) => {
      const { geography_id } = req.params
      try {
        const geography = await db.readSingleGeography(geography_id)
        if (!geography.publish_date && !res.locals.scopes.includes('geographies:read:unpublished')) {
          throw new InsufficientPermissionsError('permission to read unpublished geographies missing')
        }
        return res.status(200).send({ version: res.locals.version, data: { geography } })
      } catch (error) {
        logger.error('failed to read geography', error.stack)
        if (error instanceof NotFoundError) {
          return res.status(404).send({ error })
        }

        if (error instanceof InsufficientPermissionsError) {
          return res.status(403).send({ error })
        }

        return next(new ServerError(error))
      }
    }
  )

  app.get(
    pathPrefix('/geographies'),
    checkGeographyApiAccess(scopes => {
      return scopes.includes('geographies:read:published') || scopes.includes('geographies:read:unpublished')
    }),
    async (
      req: GeographyApiGetGeographiesRequest,
      res: GeographyApiGetGeographiesResponse,
      next: express.NextFunction
    ) => {
      const summary = req.query.summary === 'true'
      const { get_published, get_unpublished } = req.query
      const params = {
        get_published: get_published ? get_published === 'true' : null,
        get_unpublished: get_unpublished ? get_unpublished === 'true' : null
      }

      try {
        if (!res.locals.scopes.includes('geographies:read:unpublished') && params.get_unpublished) {
          throw new InsufficientPermissionsError(
            'Cannot require unpublished geos without geography:read:unpublished scope'
          )
        }

        const geographies = summary ? await db.readGeographySummaries(params) : await db.readGeographies(params)
        if (!res.locals.scopes.includes('geographies:read:unpublished')) {
          const filteredGeos = geographies.filter(geo => !!geo.publish_date)
          return res.status(200).send({ version: res.locals.version, data: { geographies: filteredGeos } })
        }
        return res.status(200).send({ version: res.locals.version, data: { geographies } })
      } catch (error) {
        /* We don't throw a NotFoundError if the number of results is zero, so the error handling
         * doesn't need to consider it here.
         */
        if (error instanceof InsufficientPermissionsError) {
          return res.status(403).send({ error })
        }
        logger.error('failed to read geographies', error.stack)
        return next(new ServerError(error))
      }
    }
  )

  /* eslint-reason global error handling middleware */
  /* istanbul ignore next */
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  app.use(async (error: Error, req: ApiRequest, res: ApiResponse, next: NextFunction) => {
    await logger.error(req.method, req.originalUrl, error)
    return res.status(500).send({ error })
  })

  return app
}

export { api }
