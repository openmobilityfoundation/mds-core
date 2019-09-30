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
  'events:read:provider',
  'events:write:provider',
  'policies:delete',
  'policies:publish',
  'policies:read',
  'policies:write',
  'providers:read',
  'service_areas:read',
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
  'events:read:provider': 'Read Events (Provider Access)',
  'events:write:provider': 'Write Events (Provider Access)',
  'policies:delete': 'Delete Policies',
  'policies:publish': 'Publish Policies',
  'policies:read': 'Read Policies',
  'policies:write': 'Write Policies',
  'providers:read': 'Read Providers',
  'service_areas:read': 'Read Service Areas',
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
