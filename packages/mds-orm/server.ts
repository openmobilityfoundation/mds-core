import Mali from 'mali'
import logger from '@mds-core/mds-logger'
import { getReadOnlyConnection } from './connection'
import { DeviceEntity } from './entities/DeviceEntity'

/**
 * Handler for the Echo RPC.
 * @param {object} ctx The request context provided by Mali.
 * @returns {Promise<void>}
 */
const findDeviceByVehicleId = async (ctx: Mali.Context) => {
  // Log that we received the request
  logger.info('Received request.', ctx.req)

  const connection = await getReadOnlyConnection()

  const device = await connection.manager.findOne(DeviceEntity, {
    where: { vehicle_id: ctx.req.vehicle_id }
  })
  // Set the response on the context
  ctx.res = {
    // Define the message, and time
    device
  }

  await connection.close()

  // Log the we set the response
  logger.info('Sending Response.', ctx.res)
}

/**
 * Create a new instance of the Mali server.
 * We pass in the path to our Protocol Buffer definition,
 * and provide a friendly name for the service.
 * @type {Mali}
 */
const app = new Mali('./protos/devices.proto', 'Devices', {
  // These are gRPC native options that Mali passes down
  // to the underlying gRPC loader.
  defaults: true,
  keepCase: true
})

// Create a listener for the Echo RPC using the echo function
// as the handler.
app.use({ findDeviceByVehicleId })

// Start listening on localhost
app.start('127.0.0.1:50051')

// Log out that we're listening and ready for connections
logger.info('Listening...')
