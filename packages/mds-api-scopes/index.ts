// Canonical list of MDS scopes
import { AccessTokenScope, ScopeValidator } from '@mds-core/mds-types'

export const validateScopes = <TAccessTokenScope extends string = AccessTokenScope>(
  validator: ScopeValidator<TAccessTokenScope>,
  scopes: TAccessTokenScope[] = []
): boolean => validator(scope => !scope || scopes.includes(scope))
