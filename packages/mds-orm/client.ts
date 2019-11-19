import grpcClient from 'grpc-caller'
import logger from '@mds-core/mds-logger'

async function main() {
  const client = grpcClient(
    'localhost:50051',
    {
      file: './protos/repository.proto',
      load: {
        defaults: true,
        keepCase: true
      }
    },
    'DeviceService'
  )

  try {
    if (process.argv.length < 3) {
      const { devices } = await client.getDevices()
      logger.info(devices.length, devices.length > 0 ? devices[0] : devices)
    } else {
      const [, , vehicle_id] = process.argv
      logger.info(`Searching for ${vehicle_id}`)
      const { device } = await client.getDeviceByVehicleId({ vehicle_id })
      logger.info(device)
    }
  } catch (err) {
    logger.info(err.message)
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
