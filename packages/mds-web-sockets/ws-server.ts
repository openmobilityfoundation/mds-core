import logger from '@mds-core/mds-logger'
import { seconds, getEnvVar, AuthorizationError } from '@mds-core/mds-utils'
import WebSocket from 'ws'
import { Nullable } from '@mds-core/mds-types'
import { ApiServer, HttpServer } from '@mds-core/mds-api-server'
import stream, { StreamProducer } from '@mds-core/mds-stream'
import { NatsError, Msg } from 'ts-nats'
import http from 'http'
import { ProcessManager } from '@mds-core/mds-service-helpers'
import { setWsHeartbeat } from 'ws-heartbeat/server'
import { DEFAULT_ENTITIES, ENTITY_TYPE, SupportedEntities } from './types'
import { Clients } from './clients'
import { wsSend } from './ws-helpers'

/**
 * Web Socket Server that autosubscribes to Nats stream and allows socket subscription by entity type
 * @param entityTypes - entity names to support
 */
export const WebSocketServer = <T extends SupportedEntities>(entityTypes?: T) => {
  let server: Nullable<http.Server> = null
  let wss: Nullable<WebSocket.Server>

  return ProcessManager({
    start: async () => {
      const supportedEntities = entityTypes || DEFAULT_ENTITIES
      server = HttpServer(ApiServer(app => app))

      logger.info('Creating WS server')
      wss = new WebSocket.Server({ server })
      logger.info('WS Server created!')

      const { TENANT_ID } = getEnvVar({
        TENANT_ID: 'mds'
      })

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

      const producers = Object.keys(supportedEntities).reduce((acc, e) => {
        return Object.assign(acc, { [e]: stream.NatsStreamProducer(`${TENANT_ID}.${e}`) })
      }, {} as { [s: string]: StreamProducer<unknown> })

      await Promise.all(Object.values(producers).map(producer => producer.initialize()))

      const pushToProducers = async (entity: ENTITY_TYPE, payload: string) => {
        const producer = producers[entity]

        return producer.write(JSON.parse(payload))
      }

      function isSupported(entity: string): entity is ENTITY_TYPE {
        return Object.keys(supportedEntities).some(e => e === entity)
      }

      function pushToClients(entity: string, message: object) {
        const staleClients: WebSocket[] = []
        if (clients.subList[entity]) {
          clients.subList[entity].forEach(client => {
            if (client.readyState !== 1) staleClients.push(client)
            else {
              // FIXME: Update all consumers to not use this deprecated portion of the protocol
              wsSend(client).push(entity).legacy(message)

              wsSend(client).push(entity).success(message)
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

          if (header === 'PUSH') {
            if (args.length === 2) {
              const [entity, payload] = args
              // Limit messages to only supported entities
              if (isSupported(entity)) {
                if (clients.isAuthenticated(ws) && clients.hasScopes(supportedEntities[entity].write, ws)) {
                  return pushToProducers(entity, payload)
                }

                return wsSend(ws)
                  .push(entity)
                  .error({ err: new AuthorizationError('Insufficient access.') })
              }

              return wsSend(ws).push(entity).error({ err: 'Invalid entity' })
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
        })
      })

      const processor = async (err: Nullable<NatsError>, msg: Msg) => {
        const entity = msg.subject.split('.')?.[1]

        await pushToClients(entity, JSON.parse(msg.data))
      }

      await Promise.all(
        Object.keys(supportedEntities).map(e => stream.NatsStreamConsumer(`${TENANT_ID}.${e}`, processor).initialize())
      )
    },
    stop: async () => {
      // eslint-disable-next-line no-new
      const stopServer = (s: http.Server | WebSocket.Server) => {
        return new Promise((resolve, reject) => {
          s.close(error => {
            if (error) {
              reject(error)
            } else {
              resolve()
            }
          })
        })
      }
      if (server) await stopServer(server)
      if (wss) await stopServer(wss)
      server = null
      wss = null
    }
  })
}
