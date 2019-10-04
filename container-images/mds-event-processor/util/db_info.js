const env = process.env
const { VEHICLE_STATUSES, VEHICLE_EVENTS } = require('@mds-core/mds-types')

let enums = {
  device_state_event_type: ['event', 'telemetry'],
  device_state: Object.keys(VEHICLE_STATUSES),
  device_event: Object.keys(VEHICLE_EVENTS).concat(
    Object.keys(VEHICLE_STATUSES)
  )
}

let tables = {}

tables.device_states = {
  name: 'device_states',
  fields: {
    type: 'varchar',
    timestamp: 'timestamp with time zone',
    device_id: 'uuid',
    provider_id: 'uuid',
    state: 'device_state',
    event_type: 'device_event',
    event_type_reason: 'varchar',
    trip_id: 'uuid',
    service_area_id: 'uuid',
    gps: 'json',
    battery: 'double precision',
    annotation_version: 'smallint',
    annotation: 'json',
    time_recorded: 'timestamp with time zone',
    last_state_data: 'json'
  },
  ok_null: [
    'state',
    'event_type',
    'event_type_reason',
    'trip_id',
    'service_area_id',
    'battery'
  ],
  primary: ['timestamp', 'device_id', 'provider_id', 'type']
}

tables.trips = {
  name: 'trips',
  fields: {
    trip_id: 'uuid',
    device_id: 'uuid',
    provider_id: 'uuid',
    start_time: 'timestamp with time zone',
    end_time: 'timestamp with time zone',
    start_district: 'uuid',
    end_district: 'uuid',
    duration: 'bigint',
    distance: 'double precision',
    telemetry: 'json[]'
  },
  ok_null: ['start_district', 'end_district'],
  primary: ['trip_id', 'device_id', 'provider_id']
}

tables.providers = {
  name: 'providers',
  fields: {
    provider_id: 'uuid',
    timestamp: 'timestamp with time zone',
    cap_count: 'bigint',
    dead_count: 'bigint',
    invalid_count: 'bigint',
    duplicate_count: 'bigint',
    ooo_count: 'bigint'
  },
  ok_null: [],
  primary: ['provider_id', 'timestamp']
}

for (let key in tables) {
  tables[key].table = env.PG_PREFIX + tables[key].name
}

module.exports = {
  enums,
  tables
}
