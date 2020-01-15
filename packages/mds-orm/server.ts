import Mali from 'mali'
import logger from '@mds-core/mds-logger'
import { ConnectionManager } from './connection'
import { DeviceEntity } from './entities/device-entity'

const manager = ConnectionManager(DeviceEntity)

/**
 * Handler for the getDeviceByVehicleId RPC.
 * @param {object} ctx The request context provided by Mali.
 * @returns {Promise<void>}
 */
const getDeviceByVehicleId = async (ctx: Mali.Context) => {
  const connection = await manager.getConnection('ro')

  const repository = connection.getRepository(DeviceEntity)

  const device = await repository.findOne({
    where: { vehicle_id: ctx.req.vehicle_id }
  })

  ctx.res = { device }
}

/**
 * Handler for the getDevices RPC.
 * @param {object} ctx The request context provided by Mali.
 * @returns {Promise<void>}
 */
const getDevices = async (ctx: Mali.Context) => {
  const connection = await manager.getConnection('ro')

  const repository = connection.getRepository(DeviceEntity)

  const { skip, take } = ctx.req

  const [devices, count] =
    take === 0
      ? []
      : await repository
          .createQueryBuilder()
          .offset(skip)
          .limit(take)
          .getManyAndCount()

  ctx.res = { count, devices }
}

/**
 * Create a new instance of the Mali server.
 * We pass in the path to our Protocol Buffer definition,
 * and provide a friendly name for the service.
 * @type {Mali}
 */
const app = new Mali('./proto/repository.proto', 'Repository', {
  // These are gRPC native options that Mali passes down
  // to the underlying gRPC loader.
  // defaults: true,
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
app.use({ getDeviceByVehicleId, getDevices })

// Start listening on localhost
app.start('127.0.0.1:50051')

logger.info('Listening...')
