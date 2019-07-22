import express from 'express'
import jwtDecode from 'jwt-decode'
import { UUID } from 'mds-types'

export interface ApiAuthorizerClaims {
  principalId: string
  provider_id: UUID
  scope: string
  email: string | null
}

const { TOKEN_PROVIDER_ID_CLAIM = 'https://ladot.io/provider_id' } = process.env

export type ApiAuthorizer = (req: express.Request) => ApiAuthorizerClaims | null

export const AuthorizationHeaderApiAuthorizer: ApiAuthorizer = req => {
  if (req.headers && req.headers.authorization) {
    const decode = ([scheme, token]: string[]): ApiAuthorizerClaims | null => {
      const decoders: { [scheme: string]: () => ApiAuthorizerClaims } = {
        bearer: () => {
          const { sub: principalId, [TOKEN_PROVIDER_ID_CLAIM]: provider_id, scope, email, ...claims } = jwtDecode(token)
          return { principalId, provider_id, scope, email, ...claims }
        },
        basic: () => {
          const [principalId, scope] = Buffer.from(token, 'base64')
            .toString()
            .split('|')
          return { principalId, provider_id: principalId, scope, email: null }
        }
      }
      const decoder = decoders[scheme.toLowerCase()]
      return decoder ? decoder() : null
    }
    return decode(req.headers.authorization.split(' '))
  }
  return null
}
