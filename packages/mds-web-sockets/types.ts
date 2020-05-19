export const ENTITY_TYPES = ['event', 'telemetry'] as const
export type ENTITY_TYPE = typeof ENTITY_TYPES[number]
