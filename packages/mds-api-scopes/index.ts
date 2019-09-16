// Canonical list of MDS scopes
export const AccessTokenScopes = [
  'admin:all',
  'audits:delete',
  'audits:read',
  'audits:vehicles:read',
  'audits:write',
  'compliance:read',
  'compliance:read:provider',
  'events:read',
  'events:write:provider',
  'geographies:delete',
  'geographies:read',
  'geographies:read:published',
  'geographies:write',
  'geographies:write:published',
  'policies:delete',
  'policies:publish',
  'policies:read',
  'policies:read:published',
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

export const ScopeDescriptions: { [S in AccessTokenScope]: string } = {
  'admin:all': 'Administrator Access',
  'audits:delete': 'Delete Audits',
  'audits:read': 'Read Audits',
  'audits:vehicles:read': 'Read Vehicles (Audit Access)',
  'audits:write': 'Write Audits',
  'compliance:read': 'Read Compliance',
  'compliance:read:provider': 'Read Compliance (Provider Access)',
  'events:read': 'Read Events',
  'events:write:provider': 'Write Events (Provider Access)',
  'geographies:delete': 'Delete Geographies',
  'geographies:read': 'Read Geographes',
  'geographies:read:published': 'Read Geographies for Published Policies',
  'geographies:write': 'Write Geographies',
  'geographies:write:published': 'Write Geographies for Published policies',
  'policies:delete': 'Delete Policies',
  'policies:publish': 'Publish Policies',
  'policies:read': 'Read Policies',
  'policies:read:published': 'Read Published Policies',
  'policies:write': 'Write Policies',
  'providers:read': 'Read Providers',
  'status_changes:read': 'Read Status Changes',
  'telemetry:write:provider': 'Write Telemetry (Provider Access)',
  'trips:read': 'Read Trips',
  'vehicles:read': 'Read Vehicles',
  'vehicles:read:provider': 'Read Vehicles (Provider Access)',
  'vehicles:write:provider': 'Write Vehicles (Provider Access)'
}

export type ScopeValidator<TAccessTokenScope extends string = AccessTokenScope> = (
  check: (scope: TAccessTokenScope) => boolean
) => boolean

export const validateScopes = <TAccessTokenScope extends string = AccessTokenScope>(
  validator: ScopeValidator<TAccessTokenScope>,
  scopes: TAccessTokenScope[] = []
): boolean => validator(scope => !scope || scopes.includes(scope))
