import Mali from 'mali'
import logger from '@mds-core/mds-logger'
import { ConnectionManager } from './connection'
import { DeviceEntity } from './entities/DeviceEntity'

const manager = ConnectionManager(DeviceEntity)

/**
 * Handler for the findDeviceByVehicleId RPC.
 * @param {object} ctx The request context provided by Mali.
 * @returns {Promise<void>}
 */
const findDeviceByVehicleId = async (ctx: Mali.Context) => {
  logger.info('Received request.', ctx.req)

  const connection = await manager.getConnection('ro')

  const device = await connection.manager.findOne(DeviceEntity, {
    where: { vehicle_id: ctx.req.vehicle_id }
  })

  // Set the response on the context
  ctx.res = { device }

  logger.info('Sending Response.', ctx.res)
}

/**
 * Handler for the findDevices RPC.
 * @param {object} ctx The request context provided by Mali.
 * @returns {Promise<void>}
 */
const findDevices = async (ctx: Mali.Context) => {
  logger.info('Received request.', ctx.req)

  const connection = await manager.getConnection('ro')

  const devices = await connection
    .createQueryBuilder()
    .select('device')
    .from(DeviceEntity, 'device')
    .limit(ctx.req.limit ?? 10_000)
    .getMany()

  // Set the response on the context
  ctx.res = { devices }

  logger.info('Sending Response.')
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

// Create a listener/handlers
app.use({ findDeviceByVehicleId, findDevices })

// Start listening on localhost
app.start('127.0.0.1:50051')

logger.info('Listening...')
