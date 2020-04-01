import { VehicleEvent, Telemetry, Device } from '@mds-core/mds-types'
import { AgencyStream, StreamProducer } from '../stream-interface'
import { KafkaStreamProducer } from './stream-producer'

const deviceProducer: StreamProducer = KafkaStreamProducer('mds.device')
const eventProducer: StreamProducer = KafkaStreamProducer('mds.event')
const telemetryProducer: StreamProducer = KafkaStreamProducer('mds.telemetry')

const initialize = async () => {
  await Promise.all([deviceProducer.initialize(), eventProducer.initialize(), telemetryProducer.initialize()])
}

const writeTelemetry = async (telemetry: Telemetry[]) => telemetryProducer.write(telemetry)

const writeEvent = async (event: VehicleEvent) => eventProducer.write(event)

const writeDevice = async (device: Device) => deviceProducer.write(device)

const shutdown = async () => {
  await Promise.all([deviceProducer.shutdown(), eventProducer.shutdown(), telemetryProducer.shutdown()])
}

export const AgencyKafkaStream: AgencyStream = { initialize, writeEvent, writeTelemetry, writeDevice, shutdown }
