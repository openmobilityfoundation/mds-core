import express from 'express'
import { pathPrefix } from '@mds-core/mds-utils'
import { checkAccess, AccessTokenScopeValidator } from '@mds-core/mds-api-server'
import { TransactionApiVersionMiddleware } from '../middleware'

import { CreateTransactionHandler } from '../handlers/create-transaction'
import { CreateTransactionsHandler } from '../handlers/create-transactions'
import { GetTransactionHandler } from '../handlers/get-transaction'
import { GetTransactionsHandler } from '../handlers/get-transactions'

import { GetTransactionOperationsHandler } from '../handlers/get-operations'
import { AddTransactionOperationHandler } from '../handlers/add-operation'
import { SetTransactionStatusHandler } from '../handlers/set-status'
import { GetTransactionStatusesHandler } from '../handlers/get-statuses'

import { TransactionApiAccessTokenScopes } from '../@types'

const checkTransactionApiAccess = (validator: AccessTokenScopeValidator<TransactionApiAccessTokenScopes>) =>
  checkAccess(validator)

// TODO more thought on scopes for this API

export const api = (app: express.Express): express.Express =>
  app
    .use(TransactionApiVersionMiddleware)
    .get(
      pathPrefix('/transactions'),
      checkTransactionApiAccess(scopes => scopes.includes('transactions:read')),
      GetTransactionsHandler
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
      checkTransactionApiAccess(scopes => scopes.includes('transactions:write')),
      GetTransactionStatusesHandler
    )
