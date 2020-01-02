import grpcClient from 'grpc-caller'
import logger from '@mds-core/mds-logger'
/* eslint reason import of generated file */
/* eslint-disable-next-line import/extensions */
import { IGetDevicesResponse } from './proto/generated'

async function main() {
  const client = grpcClient(
    'localhost:50051',
    {
      file: './proto/repository.proto',
      load: {
        // defaults: true,
        keepCase: true
      }
    },
    'Repository'
  )

  try {
    if (process.argv.length < 3) {
      const response: IGetDevicesResponse = await client.getDevices()
      logger.info(response.devices)
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
