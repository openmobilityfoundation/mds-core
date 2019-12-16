import WebSocket from 'ws'
import { VehicleEvent, Telemetry } from '@mds-core/mds-types'
import log from '@mds-core/mds-logger'
import { setWsHeartbeat, WebSocketBase } from 'ws-heartbeat/client'
import { ENTITY_TYPE } from './types'

const { TOKEN, URL = 'ws://mds-web-sockets:4000' } = process.env

let connection: WebSocket

/* Authenticate */
async function sendAuth() {
  return connection.send(`AUTH%Bearer ${TOKEN}`)
}

function getClient() {
  if (connection && connection.readyState === 1) {
    return connection
  }
  connection = new WebSocket(URL)

  setWsHeartbeat(connection as WebSocketBase, 'PING')

  connection.onopen = async () => {
    await sendAuth()
  }

  connection.onerror = async err => {
    return log.error(err)
  }

  return connection
}

/* Force test event to be send back to client */
async function sendPush(entity: ENTITY_TYPE, data: VehicleEvent | Telemetry) {
  const client = getClient()
  return client.send(`PUSH%${entity}%${JSON.stringify(data)}`)
}

export function writeTelemetry(telemetry: Telemetry) {
  return sendPush('TELEMETRIES', telemetry)
}

export function writeEvent(event: VehicleEvent) {
  return sendPush('EVENTS', event)
}

export function shutdown() {
  if (connection) connection.close()
}
