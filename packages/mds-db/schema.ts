// TODO providers are in CSV
const DEVICES_TABLE = 'devices'
const TELEMETRY_TABLE = 'telemetry'
const EVENTS_TABLE = 'events'
const TRIPS_TABLE = 'trips'
const STATUS_CHANGES_TABLE = 'status_changes'
const AUDITS_TABLE = 'audits'
const AUDIT_EVENTS_TABLE = 'audit_events'
const POLICIES_TABLE = 'policies'
const GEOGRAPHIES_TABLE = 'geographies'

// agency
const DEVICES_COLS = [
  'device_id',
  'provider_id',
  'vehicle_id',
  'type',
  'propulsion',
  'year',
  'mfgr',
  'model',
  'recorded'
] as const

const EVENTS_COLS = [
  'device_id',
  'provider_id',
  'timestamp',
  'event_type',
  'event_type_reason',
  'telemetry_timestamp',
  'trip_id',
  'service_area_id',
  'recorded'
] as const

const TELEMETRY_COLS = [
  'device_id',
  'provider_id',
  'timestamp',
  'lat',
  'lng',
  'speed',
  'heading',
  'accuracy',
  'altitude',
  'charge',
  'recorded'
] as const

const TRIPS_COLS = [
  'provider_id',
  'provider_name',
  'provider_trip_id',
  'device_id',
  'vehicle_id',
  'vehicle_type',
  'propulsion_type',
  'trip_start',
  'first_trip_enter',
  'last_trip_leave',
  'trip_end',
  'trip_duration',
  'trip_distance',
  'route',
  'accuracy',
  'parking_verification_url',
  'standard_cost',
  'actual_cost',
  'recorded',
  'sequence'
] as const

const STATUS_CHANGES_COLS = [
  'provider_id',
  'provider_name',
  'device_id',
  'vehicle_id',
  'vehicle_type',
  'propulsion_type',
  'event_type',
  'event_type_reason',
  'event_time',
  'event_location',
  'battery_pct',
  'associated_trip',
  'recorded',
  'sequence'
] as const

// audit
const AUDITS_COLS = [
  'audit_trip_id',
  'audit_vehicle_id',
  'audit_device_id',
  'audit_subject_id',
  'provider_id',
  'provider_name',
  'provider_vehicle_id',
  'provider_device_id',
  'timestamp',
  'deleted',
  'recorded'
] as const

const AUDIT_EVENTS_COLS = [
  'audit_trip_id',
  'audit_event_id',
  'audit_event_type',
  'audit_issue_code',
  'audit_subject_id',
  'note',
  'timestamp',
  'lat',
  'lng',
  'speed',
  'heading',
  'accuracy',
  'altitude',
  'charge',
  'recorded'
] as const

// policy
const POLICIES_COLS = ['policy_id', 'policy_json', 'published'] as const

const GEOGRAPHIES_COLS = ['geography_id', 'geography_json', 'published'] as const

const tables: { [propName: string]: Readonly<string[]> } = {
  [DEVICES_TABLE]: DEVICES_COLS,
  [EVENTS_TABLE]: EVENTS_COLS,
  [TELEMETRY_TABLE]: TELEMETRY_COLS,
  [TRIPS_TABLE]: TRIPS_COLS,
  [STATUS_CHANGES_TABLE]: STATUS_CHANGES_COLS,
  [AUDITS_TABLE]: AUDITS_COLS,
  [AUDIT_EVENTS_TABLE]: AUDIT_EVENTS_COLS,
  [POLICIES_TABLE]: POLICIES_COLS,
  [GEOGRAPHIES_TABLE]: GEOGRAPHIES_COLS
}

const primaryKeys: { [propName: string]: string[] } = {
  [DEVICES_TABLE]: ['device_id'],
  [EVENTS_TABLE]: ['device_id', 'timestamp'],
  [TELEMETRY_TABLE]: ['device_id', 'timestamp'],
  [TRIPS_TABLE]: ['provider_trip_id'],
  [STATUS_CHANGES_TABLE]: ['device_id', 'event_time'],
  [AUDITS_TABLE]: ['audit_trip_id'],
  [AUDIT_EVENTS_TABLE]: ['audit_trip_id', 'timestamp'],
  [POLICIES_TABLE]: ['policy_id'],
  [GEOGRAPHIES_TABLE]: ['geography_id']
}

const PG_TYPES: { [propName: string]: string } = {
  device_id: 'uuid NOT NULL',
  provider_id: 'uuid NOT NULL',
  provider_name: 'varchar(31) NOT NULL',
  timestamp: 'bigint NOT NULL',
  telemetry_timestamp: 'bigint',

  recorded: 'bigint NOT NULL', // timestamp of when record was created

  vehicle_id: 'varchar(255) NOT NULL',
  year: 'smallint',
  type: 'varchar(31) NOT NULL',
  vehicle_type: 'varchar(31) NOT NULL',
  mfgr: 'varchar(31)',
  model: 'varchar(31)',
  propulsion: 'varchar(31)[] NOT NULL',
  propulsion_type: 'varchar(31)[] NOT NULL',
  event_type: 'varchar(31) NOT NULL',
  event_type_reason: 'varchar(31)',
  trip_id: 'uuid',

  provider_trip_id: 'uuid NOT NULL',
  trip_duration: 'int',
  trip_distance: 'int',
  route: 'jsonb',
  trip_start: 'bigint',
  first_trip_enter: 'bigint',
  last_trip_leave: 'bigint',
  trip_end: 'bigint',
  parking_verification_url: 'varchar(255)',
  standard_cost: 'int',
  actual_cost: 'int',
  sequence: 'bigint',

  event_time: 'bigint NOT NULL',
  event_location: 'jsonb',
  battery_pct: 'real',
  associated_trip: 'uuid',
  service_area_id: 'uuid',

  lat: 'double precision NOT NULL',
  lng: 'double precision NOT NULL',
  speed: 'real',
  heading: 'real',
  accuracy: 'real',
  altitude: 'real',
  charge: 'real',

  audit_trip_id: 'uuid NOT NULL',
  audit_vehicle_id: 'varchar(255) NOT NULL',
  audit_device_id: 'uuid NOT NULL',
  audit_subject_id: 'varchar(255) NOT NULL',
  provider_vehicle_id: 'varchar(255) NOT NULL',
  provider_device_id: 'uuid', // May be null if can't find
  audit_event_id: 'uuid NOT NULL',
  audit_event_type: 'varchar(31) NOT NULL',
  audit_issue_code: 'varchar(31)',
  note: 'varchar(255)',

  policy_id: 'uuid NOT NULL',
  policy_json: 'json NOT NULL',
  geography_id: 'uuid NOT NULL',
  geography_json: 'json NOT NULL',

  published: 'bool DEFAULT \'f\'',

  deleted: 'bigint'
}

export = {
  DEVICES_TABLE,
  TELEMETRY_TABLE,
  EVENTS_TABLE,
  TRIPS_TABLE,
  STATUS_CHANGES_TABLE,
  AUDITS_TABLE,
  AUDIT_EVENTS_TABLE,
  POLICIES_TABLE,
  GEOGRAPHIES_TABLE,
  DEVICES_COLS,
  EVENTS_COLS,
  TELEMETRY_COLS,
  TRIPS_COLS,
  STATUS_CHANGES_COLS,
  AUDITS_COLS,
  AUDIT_EVENTS_COLS,
  POLICIES_COLS,
  GEOGRAPHIES_COLS,
  tables,
  primaryKeys,
  PG_TYPES
}
