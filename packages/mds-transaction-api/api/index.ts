/**
 * Copyright 2020 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { AccessTokenScopeValidator, ApiErrorHandlingMiddleware, checkAccess } from '@mds-core/mds-api-server'
import { isUUID, pathPrefix } from '@mds-core/mds-utils'
import express from 'express'
import { TransactionApiAccessTokenScopes } from '../@types'
import { AddTransactionOperationHandler } from '../handlers/add-operation'
import { CreateTransactionHandler } from '../handlers/create-transaction'
import { CreateTransactionsHandler } from '../handlers/create-transactions'
import { GetTransactionOperationsHandler } from '../handlers/get-operations'
import { GetTransactionStatusesHandler } from '../handlers/get-statuses'
import { GetTransactionHandler } from '../handlers/get-transaction'
import { GetTransactionsHandler } from '../handlers/get-transactions'
import { GetTransactionsStatusesHandler } from '../handlers/get-transactions-statuses'
import { SetTransactionStatusHandler } from '../handlers/set-status'
import { TransactionApiVersionMiddleware } from '../middleware'

const checkTransactionApiAccess = (validator: AccessTokenScopeValidator<TransactionApiAccessTokenScopes>) =>
  checkAccess(validator)

// TODO more thought on scopes for this API

export const api = (app: express.Express): express.Express =>
  app
    .use(TransactionApiVersionMiddleware)
    .get(
      pathPrefix('/transactions'),
      checkTransactionApiAccess(
        (scopes, claims) =>
          scopes.includes('transactions:read') ||
          (scopes.includes('transactions:read:provider') && isUUID(claims?.provider_id))
      ),
      GetTransactionsHandler
    )
    .get(
      pathPrefix('/transactions/statuses'),
      checkTransactionApiAccess(scopes => scopes.includes('transactions:read')),
      GetTransactionsStatusesHandler
    )
    .get(
      pathPrefix('/transactions/:transaction_id'),
      checkTransactionApiAccess(scopes => scopes.includes('transactions:read')),
      GetTransactionHandler
    )
    .post(
      pathPrefix('/transaction'),
      checkTransactionApiAccess(scopes => scopes.includes('transactions:write')),
      CreateTransactionHandler
    )
    .post(
      pathPrefix('/transactions'),
      checkTransactionApiAccess(scopes => scopes.includes('transactions:write')),
      CreateTransactionsHandler
    )
    .get(
      pathPrefix('/transactions/:transaction_id/operations'),
      checkTransactionApiAccess(scopes => scopes.includes('transactions:read')),
      GetTransactionOperationsHandler
    )
    .post(
      pathPrefix('/transactions/:transaction_id/operations'),
      checkTransactionApiAccess(scopes => scopes.includes('transactions:write')),
      AddTransactionOperationHandler
    )
    .post(
      pathPrefix('/transaction/:transaction_id/statuses'),
      checkTransactionApiAccess(scopes => scopes.includes('transactions:write')),
      SetTransactionStatusHandler
    )
    .get(
      pathPrefix('/transactions/:transaction_id/statuses'),
      checkTransactionApiAccess(scopes => scopes.includes('transactions:read')),
      GetTransactionStatusesHandler
    )
    .use(ApiErrorHandlingMiddleware)
