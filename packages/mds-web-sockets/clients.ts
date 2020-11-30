import WebSocket from 'ws'
import { WebSocketAuthorizer } from '@mds-core/mds-api-authorizer'
import { AuthorizationError } from '@mds-core/mds-utils'
import logger from '@mds-core/mds-logger'
import jwt from 'jsonwebtoken'
import jwks from 'jwks-rsa'
import { promisify } from 'util'
import { ENTITY_TYPE, SupportedEntities } from './types'
import { wsSend } from './ws-helpers'

type Client = { scopes: string[]; socket: WebSocket }

export class Clients {
  authenticatedClients: Map<Client['socket'], Client>

  subList: { [key: string]: WebSocket[] }

  supportedEntities: SupportedEntities

  public static getKey = async (header: { kid: string }) => {
    const { JWKS_URI } = process.env

    if (!JWKS_URI) throw new Error('No JWKS_URI defined!')

    const client = jwks({
      jwksUri: JWKS_URI
    })

    /* Technically, this typedef is slightly incorrect, but is to coerce the compiler to happiness without type guarding. One of publicKey or rsaPublicKey *always* exists. */
    const key: { publicKey?: string; rsaPublicKey?: string } = await promisify(client.getSigningKey)(
      header.kid ?? 'null'
    )

    return key.publicKey || key.rsaPublicKey
  }

  public constructor(supportedEntities: SupportedEntities) {
    // Initialize subscription list with configured entities
    this.subList = Object.fromEntries(Object.keys(supportedEntities).map(e => [e, []]))
    this.authenticatedClients = new Map()
    this.saveClient = this.saveClient.bind(this)
    this.supportedEntities = supportedEntities
  }

  public hasScopes(neededScopes: string[], client: WebSocket) {
    const clientEntry = this.authenticatedClients.get(client)

    if (clientEntry) {
      const { scopes: clientScopes } = clientEntry
      return neededScopes.some(x => clientScopes.includes(x))
    }

    return false
  }

  public isAuthenticated(client: WebSocket) {
    return this.authenticatedClients.has(client)
  }

  public saveClient(entities: string[], client: WebSocket) {
    if (!this.authenticatedClients.has(client)) {
      return
    }

    const trimmedEntities = entities.map(entity => entity.trim()) as ENTITY_TYPE[]

    return Promise.all(
      trimmedEntities.map(entity => {
        try {
          if (this.hasScopes(this.supportedEntities[entity].read, client)) {
            this.subList[entity].push(client)
            wsSend(client).subResponse(entity).success()
          } else {
            throw new AuthorizationError('Client is missing proper scopes!')
          }
        } catch {
          wsSend(client).subResponse(entity).error()
          return logger.error(`failed to push ${entity}`)
        }
      })
    )
  }

  public async saveAuth(authorizer: string, client: WebSocket) {
    try {
      const [, token] = authorizer.split(' ')

      const auth = WebSocketAuthorizer(authorizer)

      const validateAuth = await Clients.checkAuth(token)
      if (!validateAuth) {
        wsSend(client).authResponse().error()
        return
      }

      const scopes = auth?.scope.split(' ') ?? []

      this.authenticatedClients.set(client, { scopes, socket: client })
      wsSend(client).authResponse().success()
    } catch (err) {
      logger.warn(err)
      wsSend(client).authResponse().error()
    }
  }

  public static async checkAuth(token: string) {
    try {
      const { JWT_ISSUER, JWT_AUDIENCE } = process.env
      const { header } = jwt.decode(token, { complete: true, json: true }) as { header: { kid: string } }
      const key = (await this.getKey(header)) as string
      return jwt.verify(token, key, { audience: JWT_AUDIENCE, issuer: JWT_ISSUER })
    } catch (err) {
      logger.warn(err)
      return false
    }
  }
}
