import express from 'express'
import { pathPrefix } from '@mds-core/mds-utils'
import { validateModalityPolicy } from '@mds-core/mds-schema-validators'
import { PolicyAuthorApiVersionMiddleware } from './policy-author-api-version'

export function injectVersion(app: express.Express): express.Express {
  app.use(PolicyAuthorApiVersionMiddleware)
  return app
}

export function injectModalityValidator(app: express.Express): express.Express {
  app.post(pathPrefix('/policies'), (req, res, next) => {
    try {
      validateModalityPolicy(req.body)
      return next()
    } catch (error) {
      return next(error)
    }
  })

  app.put(pathPrefix('/policies/:policy_id'), (req, res, next) => {
    try {
      validateModalityPolicy(req.body)
      return next()
    } catch (error) {
      return next(error)
    }
  })

  return app
}
