// Canonical list of MDS scopes
const AccessTokenScopes = [
  'admin:all',
  'audits:delete',
  'audits:read',
  'audits:write',
  'compliance:read',
  'compliance:read:provider',
  'events:read',
  'events:write:provider',
  'geographies:delete',
  'geographies:read',
  'geographies:write',
  'policies:delete',
  'policies:publish',
  'policies:read',
  'policies:write',
  'providers:read',
  'status_changes:read',
  'telemetry:write:provider',
  'trips:read',
  'vehicles:read',
  'vehicles:read:provider',
  'vehicles:write:provider'
] as const
export type AccessTokenScope = typeof AccessTokenScopes[number]

export type ScopeValidator<TAccessTokenScope extends string = AccessTokenScope> = (
  check: (scope: TAccessTokenScope) => boolean
) => boolean

export const validateScopes = <TAccessTokenScope extends string = AccessTokenScope>(
  validator: ScopeValidator<TAccessTokenScope>,
  scopes: TAccessTokenScope[] = []
): boolean => validator(scope => !scope || scopes.includes(scope))
