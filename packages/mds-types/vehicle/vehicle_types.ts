export const VEHICLE_TYPES = ['car', 'bicycle', 'scooter', 'moped', 'other'] as const
export type VEHICLE_TYPE = typeof VEHICLE_TYPES[number]
