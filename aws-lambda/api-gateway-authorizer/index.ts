import express from 'express'
import { ApiAuthorizerClaims, ApiAuthorizer } from 'mds-api-authorizer'

// Allow adding type definitions for Express Request objects
export interface ApiGatewayRequest extends express.Request {
  apiGateway?: {
    event?: {
      requestContext?: {
        authorizer?: ApiAuthorizerClaims
      }
    }
  }
}

export const ApiGatewayAuthorizer: ApiAuthorizer = (req: ApiGatewayRequest) =>
  (req.apiGateway &&
    req.apiGateway.event &&
    req.apiGateway.event.requestContext &&
    req.apiGateway.event.requestContext.authorizer) ||
  {}
