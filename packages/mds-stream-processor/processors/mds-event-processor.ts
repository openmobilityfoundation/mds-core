import {
  VehicleEvent,
  EVENT_STATUS_MAP,
  Timestamp,
  Nullable,
  VEHICLE_STATUS,
  UUID,
  VEHICLE_EVENT,
  VEHICLE_REASON
} from '@mds-core/mds-types'
import { StreamProcessor, KafkaStreamSource, KafkaStreamSink, StreamTransform } from '../index'
import {
  deviceLabeler,
  geographiesLabeler,
  GeographiesLabel,
  messageLatencyLabeler,
  MessageLatencyLabel,
  DeviceLabel
} from '../labelers'

interface LabeledVehicleEvent extends MessageLatencyLabel, DeviceLabel, GeographiesLabel {
  device_id: UUID
  provider_id: UUID
  event_type: VEHICLE_EVENT
  event_type_reason: Nullable<VEHICLE_REASON>
  event_timestamp: Timestamp
  event_recorded: Timestamp
  trip_id: Nullable<UUID>
  telemetry_timestamp: Nullable<Timestamp>
  telemetry_lat: Nullable<number>
  telemetry_lng: Nullable<number>
  telemetry_altitude: Nullable<number>
  telemetry_heading: Nullable<number>
  telemetry_speed: Nullable<number>
  telemetry_accuracy: Nullable<number>
  telemetry_charge: Nullable<number>
  vehicle_state: VEHICLE_STATUS
}

const processVehicleEvent: StreamTransform<VehicleEvent, LabeledVehicleEvent> = async ({
  device_id,
  provider_id,
  event_type,
  event_type_reason,
  timestamp,
  recorded,
  trip_id,
  telemetry
}) => {
  const [deviceLabel, messageLatencyLabel, geographiesLabel] = await Promise.all([
    deviceLabeler({ device_id }),
    messageLatencyLabeler({ timestamp, recorded }),
    geographiesLabeler({ telemetry })
  ])
  const transformed: LabeledVehicleEvent = {
    device_id,
    provider_id,
    event_type,
    event_type_reason: event_type_reason ?? null,
    event_timestamp: timestamp,
    event_recorded: recorded,
    trip_id: trip_id ?? null,
    telemetry_timestamp: telemetry?.timestamp ?? null,
    telemetry_lat: telemetry?.gps.lat ?? null,
    telemetry_lng: telemetry?.gps.lng ?? null,
    telemetry_altitude: telemetry?.gps.altitude ?? null,
    telemetry_heading: telemetry?.gps.heading ?? null,
    telemetry_speed: telemetry?.gps.speed ?? null,
    telemetry_accuracy: telemetry?.gps.accuracy ?? null,
    telemetry_charge: telemetry?.charge ?? null,
    vehicle_state: EVENT_STATUS_MAP[event_type],
    ...messageLatencyLabel,
    ...deviceLabel,
    ...geographiesLabel
  }
  return transformed
}

export const VehicleEventProcessor = StreamProcessor(
  KafkaStreamSource<VehicleEvent>('mds.event', { groupId: 'mds-event-processor' }),
  processVehicleEvent,
  KafkaStreamSink<LabeledVehicleEvent>('mds.event.annotated', { clientId: 'mds-event-processor' })
)
