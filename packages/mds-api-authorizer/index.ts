import express from 'express'
import jwtDecode from 'jwt-decode'
import { UUID } from 'mds'

export type ApiAuthorizerClaims = Partial<{
  principalId: string
  provider_id: UUID
  scope: string
  email: string
}>

export type ApiAuthorizer = (req: express.Request) => ApiAuthorizerClaims

export const AuthorizationHeaderApiAuthorizer: ApiAuthorizer = req => {
  if (req.headers && req.headers.authorization) {
    const decode = ([scheme, token]: string[]): ApiAuthorizerClaims => {
      const decoders: { [scheme: string]: () => ApiAuthorizerClaims } = {
        bearer: () => {
          const { sub, ...claims } = jwtDecode(token)
          return { principalId: sub, ...claims }
        },
        basic: () => {
          const [principalId, scope] = Buffer.from(token, 'base64')
            .toString()
            .split('|')
          return { principalId, scope }
        }
      }
      const decoder = decoders[scheme.toLowerCase()]
      return decoder ? decoder() : {}
    }
    return decode(req.headers.authorization.split(' '))
  }
  return {}
}
