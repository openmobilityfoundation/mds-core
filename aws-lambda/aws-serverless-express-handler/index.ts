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
import awsServerlessExpress from 'aws-serverless-express'
import awsServerlessExpressMiddleware from 'aws-serverless-express/middleware'
import { decrypt } from '@aws-lambda/aws-utils'
import { Handler } from 'aws-lambda'
import { ApiServer } from '@mds-core/mds-api-server'
import { ApiAuthorizerClaims, ApiAuthorizer } from '@mds-core/mds-api-authorizer'

// These global variables will be set by webpack
declare const NPM_PACKAGE_NAME: string
declare const NPM_PACKAGE_VERSION: string
declare const NPM_PACKAGE_GIT_BRANCH: string
declare const NPM_PACKAGE_GIT_COMMIT: string
declare const NPM_PACKAGE_BUILD_DATE: string

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
  null

export type AwsServerlessExpressHandlerFunction = Handler<{}, awsServerlessExpress.Response>

/* istanbul ignore next */
export const AwsServerlessExpressHandler = (
  api: (app: express.Express) => express.Express
): AwsServerlessExpressHandlerFunction => {
  Object.assign(process.env, {
    npm_package_name: NPM_PACKAGE_NAME,
    npm_package_version: NPM_PACKAGE_VERSION,
    npm_package_git_branch: NPM_PACKAGE_GIT_BRANCH,
    npm_package_git_commit: NPM_PACKAGE_GIT_COMMIT,
    npm_package_build_date: NPM_PACKAGE_BUILD_DATE
  })

  const server = awsServerlessExpress.createServer(
    ApiServer(api, { authorizer: ApiGatewayAuthorizer }, express().use(awsServerlessExpressMiddleware.eventContext()))
  )

  return async (event, context) => {
    if (process.env.PG_PASS_ENCRYPTED) {
      Object.assign(process.env, { PG_PASS: await decrypt(process.env.PG_PASS_ENCRYPTED) })
    }
    // The following is required to support async handlers with AWS serverless express:
    // https://github.com/awslabs/aws-serverless-express/issues/134#issuecomment-495026574
    return awsServerlessExpress.proxy(server, event, context, 'PROMISE').promise
  }
}
