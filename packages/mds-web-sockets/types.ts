export const ENTITY_TYPES = ['event', 'telemetry'] as const
export type ENTITY_TYPE = typeof ENTITY_TYPES[number]

export type SupportedEntities = {
  [e in ENTITY_TYPE]: { read: string[]; write: string[] }
}
export const DEFAULT_ENTITIES: SupportedEntities = {
  event: { read: ['events:read'], write: ['events:write'] },
  telemetry: { read: ['telemetry:read'], write: ['telemetry:write'] }
}
