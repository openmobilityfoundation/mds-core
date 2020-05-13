import logger from '@mds-core/mds-logger'
import { seconds, getEnvVar } from '@mds-core/mds-utils'
import WebSocket from 'ws'
import { setWsHeartbeat } from 'ws-heartbeat/server'
import { Telemetry, VehicleEvent, Nullable } from '@mds-core/mds-types'
import { ApiServer, HttpServer } from '@mds-core/mds-api-server'
import stream from '@mds-core/mds-stream'
import { NatsError, Msg } from 'ts-nats'
import { Clients } from './clients'
import { ENTITY_TYPE } from './types'

export const WebSocketServer = async () => {
  const server = HttpServer(ApiServer(app => app))

  logger.info('Creating WS server')
  const wss = new WebSocket.Server({ server })
  logger.info('WS Server created!')

  setWsHeartbeat(
    wss,
    (ws, data) => {
      if (data === 'PING') {
        ws.send('PONG')
      }
    },
    seconds(60)
  )

  const clients = new Clients()

  function pushToClients(entity: ENTITY_TYPE, message: string) {
    const staleClients: WebSocket[] = []
    if (clients.subList[entity]) {
      clients.subList[entity].forEach(client => {
        if (client.readyState !== 1) staleClients.push(client)
        else {
          client.send(`${entity}%${message}`)
          client.emit(entity, message)
        }
      })
    }

    Object.keys(clients.subList).map(entityKey => {
      clients.subList[entityKey] = clients.subList[entityKey].filter(client => !staleClients.includes(client))
    })

    staleClients.forEach(client => client.close())
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function writeTelemetry(telemetry: Telemetry) {
    pushToClients('TELEMETRIES', JSON.stringify(telemetry))
  }

  function writeEvent(event: VehicleEvent) {
    pushToClients('EVENTS', JSON.stringify(event))
  }

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', async (data: WebSocket.Data) => {
      const message = data.toString().trim().split('%')
      const [header, ...args] = message

      /* Testing message, also useful in a NATS-less environment */
      if (header === 'PUSH') {
        if (clients.isAuthenticated(ws)) {
          if (args.length === 2) {
            const [entity, payload] = args
            switch (entity) {
              case 'EVENTS': {
                const event = JSON.parse(payload)
                return writeEvent(event)
              }
              case 'TELEMETRIES': {
                const telemetry = JSON.parse(payload)
                return writeTelemetry(telemetry)
              }
              default: {
                return ws.send(`Invalid entity: ${entity}`)
              }
            }
          }
        }
      }

      if (header === 'AUTH') {
        const [token] = args
        if (token) {
          return clients.saveAuth(token, ws)
        }
      }

      if (header === 'SUB') {
        return clients.saveClient(args, ws)
      }

      if (header === 'PING') {
        return
      }

      return ws.send('Invalid request!')
    })
  })

  const { TENANT_ID } = getEnvVar({
    TENANT_ID: 'mds'
  })

  const eventProcessor = async (err: Nullable<NatsError>, msg: Msg) => {
    if (err) logger.error(err)
    const data = JSON.parse(msg.data)
    await writeEvent(data)
  }

  const telemetryProcessor = async (err: Nullable<NatsError>, msg: Msg) => {
    if (err) logger.error(err)
    const data = JSON.parse(msg.data)
    await writeTelemetry(data)
  }

  await stream.NatsStreamConsumer(`${TENANT_ID}.event`, eventProcessor).initialize()
  await stream.NatsStreamConsumer(`${TENANT_ID}.telemetry`, telemetryProcessor).initialize()
}
