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
  const connection = await manager.getConnection('ro')

  const device = await connection.manager.findOne(DeviceEntity, {
    where: { vehicle_id: ctx.req.vehicle_id }
  })

  ctx.res = { device }
}

/**
 * Handler for the findDevices RPC.
 * @param {object} ctx The request context provided by Mali.
 * @returns {Promise<void>}
 */
const findDevices = async (ctx: Mali.Context) => {
  const connection = await manager.getConnection('ro')

  const devices = await connection
    .createQueryBuilder()
    .select('device')
    .from(DeviceEntity, 'device')
    .limit(ctx.req.limit ?? 10_000)
    .getMany()

  ctx.res = { devices }
}

/**
 * Create a new instance of the Mali server.
 * We pass in the path to our Protocol Buffer definition,
 * and provide a friendly name for the service.
 * @type {Mali}
 */
const app = new Mali('./protos/repository.proto', 'Repository', {
  // These are gRPC native options that Mali passes down
  // to the underlying gRPC loader.
  defaults: true,
  keepCase: true
})

app.use(async (ctx: Mali.Context, next: Function) => {
  const start = Date.now()
  logger.info('Received request', ctx.req)
  await next()
  const ms = Date.now() - start
  logger.info(`Sent Reponse ${ctx.name} ${ctx.type} ${ms}ms`)
})

// Create a listener/handlers
app.use({ findDeviceByVehicleId, findDevices })

// Start listening on localhost
app.start('127.0.0.1:50051')

logger.info('Listening...')
