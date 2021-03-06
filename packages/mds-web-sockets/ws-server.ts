import logger from '@mds-core/mds-logger'
import { seconds, getEnvVar } from '@mds-core/mds-utils'
import WebSocket from 'ws'
import { setWsHeartbeat } from 'ws-heartbeat/server'
import { Nullable } from '@mds-core/mds-types'
import { ApiServer, HttpServer } from '@mds-core/mds-api-server'
import stream from '@mds-core/mds-stream'
import { NatsError, Msg } from 'ts-nats'
import { ENTITY_TYPES } from './types'
import { Clients } from './clients'

/**
 * Web Socket Server that autosubscribes to Nats stream and allows socket subscription by entity type
 * @param entityTypes - entity names to support
 */
export const WebSocketServer = async <T extends readonly string[]>(entityTypes?: T) => {
  const supportedEntities = entityTypes || ENTITY_TYPES
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

  const clients = new Clients(supportedEntities)

  function isSupported(entity: string) {
    return supportedEntities.some(e => e === entity)
  }

  function pushToClients(entity: string, message: string) {
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

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', async (data: WebSocket.Data) => {
      const message = data.toString().trim().split('%')
      const [header, ...args] = message

      /* Testing message, also useful in a NATS-less environment */
      if (header === 'PUSH') {
        if (clients.isAuthenticated(ws)) {
          if (args.length === 2) {
            const [entity, payload] = args
            // Limit messages to only supported entities
            if (isSupported(entity)) {
              await pushToClients(entity, payload)
              return
            }
            return ws.send(`Invalid entity: ${entity}`)
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

  const processor = async (err: Nullable<NatsError>, msg: Msg) => {
    const entity = msg.subject.split('.')?.[1]
    await pushToClients(entity, JSON.stringify(msg.data))
  }

  supportedEntities.forEach(async e => {
    await stream.NatsStreamConsumer(`${TENANT_ID}.event`, processor).initialize()
  })
}
