import grpcClient from 'grpc-caller'
import logger from '@mds-core/mds-logger'

async function main() {
  const client = grpcClient(
    'localhost:50051',
    {
      file: './protos/devices.proto',
      load: {
        defaults: true,
        keepCase: true
      }
    },
    'Devices'
  )

  try {
    if (process.argv.length < 3) {
      const { devices } = await client.findDevices()
      logger.info(devices.length)
    } else {
      const [, , vehicle_id] = process.argv
      logger.info(`Searching for ${vehicle_id}`)
      const { device } = await client.findDeviceByVehicleId({ vehicle_id })
      logger.info(device)
    }
  } catch (err) {
    logger.info(err.message)
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
