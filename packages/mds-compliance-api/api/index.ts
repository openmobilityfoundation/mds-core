import { AccessTokenScopeValidator, checkAccess } from '@mds-core/mds-api-server'
import { pathPrefix } from '@mds-core/mds-utils'
import express from 'express'
import { ComplianceApiAccessTokenScopes } from '../@types'
import {
  GetComplianceSnapshotIDsHandler,
  GetViolationDetailsSnapshotHandler,
  GetViolationPeriodsHandler
} from '../handlers'
import { ComplianceApiVersionMiddleware } from '../middleware'

const checkComplianceApiAccess = (validator: AccessTokenScopeValidator<ComplianceApiAccessTokenScopes>) =>
  checkAccess(validator)

export const api = (app: express.Express): express.Express =>
  app
    .use(ComplianceApiVersionMiddleware)
    .get(
      pathPrefix('/violation_periods'),
      checkComplianceApiAccess(
        scopes => scopes.includes('compliance:read') || scopes.includes('compliance:read:provider')
      ),
      GetViolationPeriodsHandler
    )
    .get(
      pathPrefix('/violation_details_snapshot'),
      checkComplianceApiAccess(
        scopes => scopes.includes('compliance:read') || scopes.includes('compliance:read:provider')
      ),
      GetViolationDetailsSnapshotHandler
    )
    .get(
      pathPrefix('/compliance_snapshot_ids'),
      checkComplianceApiAccess(
        scopes => scopes.includes('compliance:read') || scopes.includes('compliance:read:provider')
      ),
      GetComplianceSnapshotIDsHandler
    )
