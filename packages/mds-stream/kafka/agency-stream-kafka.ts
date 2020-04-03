import { VehicleEvent, Telemetry, Device } from '@mds-core/mds-types'
import { AgencyStream } from '../stream-interface'
import { KafkaStreamProducer } from './stream-producer'

const {
  env: { TENANT_ID = 'mds' }
} = process

const deviceProducer = KafkaStreamProducer<Device>(`${TENANT_ID}.device`)
const eventProducer = KafkaStreamProducer<VehicleEvent>(`${TENANT_ID}.event`)
const telemetryProducer = KafkaStreamProducer<Telemetry>(`${TENANT_ID}.telemetry`)

export const AgencyKafkaStream: AgencyStream = {
  initialize: async () => {
    await Promise.all([deviceProducer.initialize(), eventProducer.initialize(), telemetryProducer.initialize()])
  },
  writeEvent: eventProducer.write,
  writeTelemetry: telemetryProducer.write,
  writeDevice: deviceProducer.write,
  shutdown: async () => {
    await Promise.all([deviceProducer.shutdown(), eventProducer.shutdown(), telemetryProducer.shutdown()])
  }
}
