/**
 * Copyright 2019 City of Los Angeles
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
import { pathPrefix } from '@mds-core/mds-utils'
import express from 'express'
import { DeletePolicyHandler } from './handlers/delete-policy'
import { GetBulkPolicyMetadataHandler } from './handlers/get-bulk-policy-metadata'
import { GetPolicyMetadataHandler } from './handlers/get-policy-metadata'
import { PublishPolicyHandler } from './handlers/publish-policy'
import { UpdatePolicyHandler } from './handlers/update-policy'
import { UpdatePolicyMetadataHandler } from './handlers/update-policy-metadata'
import { WritePolicyHandler } from './handlers/write-policy'
import { PolicyAuthorApiVersionMiddleware } from './policy-author-api-version'
import { PolicyAuthorApiAccessTokenScopes } from './types'

const checkPolicyAuthorApiAccess = (validator: AccessTokenScopeValidator<PolicyAuthorApiAccessTokenScopes>) =>
  checkAccess(validator)

export const api = (app: express.Express): express.Express =>
  app
    .use(PolicyAuthorApiVersionMiddleware)
    .post(
      pathPrefix('/policies'),
      checkPolicyAuthorApiAccess(scopes => scopes.includes('policies:write')),
      WritePolicyHandler
    )
    .post(
      pathPrefix('/policies/:policy_id/publish'),
      checkPolicyAuthorApiAccess(scopes => scopes.includes('policies:publish')),
      PublishPolicyHandler
    )
    .put(
      pathPrefix('/policies/:policy_id'),
      checkPolicyAuthorApiAccess(scopes => scopes.includes('policies:write')),
      UpdatePolicyHandler
    )
    .delete(
      pathPrefix('/policies/:policy_id'),
      checkPolicyAuthorApiAccess(scopes => scopes.includes('policies:delete')),
      DeletePolicyHandler
    )
    .get(
      pathPrefix('/policies/meta/'),
      checkPolicyAuthorApiAccess(scopes => scopes.includes('policies:read')),
      GetBulkPolicyMetadataHandler
    )
    .get(
      pathPrefix('/policies/:policy_id/meta'),
      checkPolicyAuthorApiAccess(scopes => scopes.includes('policies:read')),
      GetPolicyMetadataHandler
    )
    .put(
      pathPrefix('/policies/:policy_id/meta'),
      checkPolicyAuthorApiAccess(scopes => scopes.includes('policies:write')),
      UpdatePolicyMetadataHandler
    )
    .use(ApiErrorHandlingMiddleware)
