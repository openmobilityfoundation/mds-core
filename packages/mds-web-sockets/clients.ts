import WebSocket from 'ws'
import { WebSocketAuthorizer } from '@mds-core/mds-api-authorizer'
import { AuthorizationError } from '@mds-core/mds-utils'
import log from '@mds-core/mds-logger'

export class Clients {
  authenticatedClients: WebSocket[]

  subList: { [key: string]: WebSocket[] }

  public constructor() {
    this.subList = { EVENTS: [], TELEMETRIES: [] }
    this.authenticatedClients = []
    this.saveClient = this.saveClient.bind(this)
  }

  public isAuthenticated(client: WebSocket) {
    return this.authenticatedClients.includes(client)
  }

  public saveClient(entities: string[], client: WebSocket) {
    if (!this.authenticatedClients.includes(client)) {
      client.send('Not authenticated!')
      return
    }

    const trimmedEntities = entities.map(entity => entity.trim())

    return Promise.all(
      trimmedEntities.map(entity => {
        try {
          this.subList[entity].push(client)
        } catch {
          return log.error(`failed to push ${entity}`)
        }
      })
    )
  }

  public saveAuth(token: string, client: WebSocket) {
    try {
      const auth = WebSocketAuthorizer(token)
      const scopes = auth?.scope.split(' ') ?? []
      if (scopes.includes('admin:all')) {
        this.authenticatedClients.push(client)
        client.send('Authentication success!')
      } else client.send(new AuthorizationError())
    } catch (err) {
      client.send(JSON.stringify(err))
    }
  }
}
