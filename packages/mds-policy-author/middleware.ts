import express from 'express'
import { PolicyAuthorApiVersionMiddleware } from './policy-author-api-version'

export const injectVersionMiddleware = (app: express.Express): express.Express => {
  app.use(PolicyAuthorApiVersionMiddleware)
  return app
}
