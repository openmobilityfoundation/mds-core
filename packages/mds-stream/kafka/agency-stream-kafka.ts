import { VehicleEvent, Telemetry, Device } from '@mds-core/mds-types'
import { AgencyStream } from '../stream-interface'
import { KafkaStreamProducer } from './stream-producer'

const deviceProducer = KafkaStreamProducer<Device>('mds.device')
const eventProducer = KafkaStreamProducer<VehicleEvent>('mds.event')
const telemetryProducer = KafkaStreamProducer<Telemetry>('mds.telemetry')

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
