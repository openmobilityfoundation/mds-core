import express from 'express'
import db from '@mds-core/mds-db'

import { pathsFor, ServerError, NotFoundError, InsufficientPermissionsError, BadParamsError } from '@mds-core/mds-utils'
import { GeographyApiVersionMiddleware } from './middleware'
import log from '@mds-core/mds-logger'

import { checkAccess } from '@mds-core/mds-api-server'

function api(app: express.Express): express.Express {
  app
    .use(GeographyApiVersionMiddleware)
    .get(
      pathsFor('/geographies/meta/'),
      checkAccess(scopes => {
        return scopes.includes('geographies:read:published') || scopes.includes('geographies:read:unpublished')
      }),
      async (req, res) => {
        const { scopes } = res.locals
        const { get_published = null, get_unpublished = null } = req.query
        const params = { get_published, get_unpublished }
        if (get_published) {
          params.get_published = get_published === 'true'
        }

        if (get_unpublished) {
          params.get_unpublished = get_unpublished === 'true'
        }

        /* If the user can only read published geos, and all they want is the unpublished metadata,
        * throw a permissions error.
        */
        try {
          if (!scopes.includes('geographies:read:unpublished') && params.get_unpublished) {
            throw new InsufficientPermissionsError(
              'Cannot require unpublished geo metadata without geography:read:unpublished scope'
            )
          }

          /* If the user has only the read:published scope, they should not be allowed to see
          * unpublished geos. If they didn't supply any params, we modify them here so as to
          * filter only for published geo metadata. We have to monkey with the params here
          * in a way that we don't for the bulk read of the geographies since we can't filter
          * the DB results in this layer, since metadata has no idea if the geo it's associated
          * with is published or not.
          */
          if (
            !scopes.includes('geographies:read:unpublished') &&
            params.get_unpublished === null &&
            params.get_published === null
          ) {
            params.get_published = true
          }
          const geography_metadata = await db.readBulkGeographyMetadata(params)
          return res.status(200).send({ version: res.locals.version, geography_metadata })
        } catch (error) {
          await log.error('failed to read geography metadata', error)
          /* This error is thrown if both get_published and get_unpublished are set.
          * To get all geos, neither parameter should be set.
          */
          if (error instanceof BadParamsError) {
            return res.status(400).send({ error })
          }
          if (error instanceof InsufficientPermissionsError) {
            return res.status(403).send({ error })
          }
          return res.status(500).send({ error })
        }
      }
    )

    app.get(
      pathsFor('/geographies/:geography_id'),
      checkAccess(scopes => {
        return scopes.includes('geographies:read:published') || scopes.includes('geographies:read:unpublished')
      }),
      async (req, res) => {
        const { geography_id } = req.params
        try {
          const geography = await db.readSingleGeography(geography_id)
          if (!geography.publish_date && !res.locals.scopes.includes('geographies:read:unpublished')) {
            throw new InsufficientPermissionsError('permission to read unpublished geographies missing')
          }
          return res.status(200).send({ version: res.locals.version, geography })
        } catch (err) {
          await log.error('failed to read geography', err.stack)
          if (err instanceof NotFoundError) {
            return res.status(404).send({ error: err })
          }

          if (err instanceof InsufficientPermissionsError) {
            return res.status(403).send({ error: err })
          }

          return res.status(500).send({ error: new ServerError() })
        }
      }
    )

    app.get(
      pathsFor('/geographies'),
      checkAccess(scopes => {
        return scopes.includes('geographies:read:published') || scopes.includes('geographies:read:unpublished')
      }),
      async (req, res) => {
        const summary = req.query.summary === 'true'
        const { get_published = null, get_unpublished = null } = req.query
        const params = { get_published, get_unpublished }
        if (get_published) {
          params.get_published = get_published === 'true'
        }

        if (get_unpublished) {
          params.get_unpublished = get_unpublished === 'true'
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
            return res.status(200).send({ version: res.locals.version, geographies: filteredGeos })
          }
          return res.status(200).send({ version: res.locals.version, geographies })
        } catch (error) {
          /* We don't throw a NotFoundError if the number of results is zero, so the error handling
          * doesn't need to consider it here.
          */
          if (error instanceof InsufficientPermissionsError) {
            return res.status(403).send({ error })
          }
          await log.error('failed to read geographies', error.stack)
          return res.status(500).send({ error: new ServerError() })
        }
      }
    )

    app.get(
      pathsFor('/geographies/:geography_id/meta'),
      checkAccess(scopes => {
        return scopes.includes('geographies:read:published') || scopes.includes('geographies:read:unpublished')
      }),
      async (req, res) => {
        const { geography_id } = req.params
        try {
          const geography_metadata = await db.readSingleGeographyMetadata(geography_id)
          const geography = await db.readSingleGeography(geography_id)
          if (!geography.publish_date && !res.locals.scopes.includes('geographies:read:unpublished')) {
            throw new InsufficientPermissionsError('permission to read metadata of unpublished geographies missing')
          }
          return res.status(200).send({ version: res.locals.version, geography_metadata })
        } catch (err) {
          await log.error('failed to read geography metadata', err.stack)
          if (err instanceof NotFoundError) {
            return res.status(404).send({ error: err })
          }
          if (err instanceof InsufficientPermissionsError) {
            return res.status(403).send({ error: err })
          }
          return res.status(500).send({ error: new ServerError() })
        }
      }
    )

  return app
}

export { api }
