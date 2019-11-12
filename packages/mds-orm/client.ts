import grpcClient from 'grpc-caller'
import logger from '@mds-core/mds-logger'

async function main() {
  const client = grpcClient(
    'localhost:50051',
    {
      file: './protos/devices.proto',
      load: {
        // These are gRPC native options that Mali passes down
        // to the underlying gRPC loader.
        defaults: true,
        keepCase: true
      }
    },
    'Devices'
  )
  if (process.argv.length < 3) {
    logger.info('Please specify a vehicle_id to search for')
  } else {
    const [, , vehicle_id] = process.argv
    logger.info(`Searching for ${vehicle_id}`)
    try {
      const response = await client.findDeviceByVehicleId({ vehicle_id })
      logger.info(response)
    } catch (err) {
      logger.info(err.message)
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
