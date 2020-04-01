import express from 'express'
import decode from 'jwt-decode'
import { UUID } from '@mds-core/mds-types'

export interface AuthorizerClaims {
  principalId: string
  scope: string
  provider_id: UUID | null
  user_email: string | null
  jurisdictions: string | null
}

const {
  TOKEN_PROVIDER_ID_CLAIM = 'https://ladot.io/provider_id',
  TOKEN_USER_EMAIL_CLAIM = 'https://ladot.io/user_email',
  TOKEN_JURISDICTIONS_CLAIM = 'https://ladot.io/jurisdictions'
} = process.env

export type Authorizer = (authorization: string) => AuthorizerClaims | null
export type ApiAuthorizer = (req: express.Request) => AuthorizerClaims | null

const decoders: { [scheme: string]: (token: string) => AuthorizerClaims } = {
  bearer: (token: string) => {
    const {
      sub: principalId,
      scope,
      [TOKEN_PROVIDER_ID_CLAIM]: provider_id = null,
      [TOKEN_USER_EMAIL_CLAIM]: user_email = null,
      [TOKEN_JURISDICTIONS_CLAIM]: jurisdictions = null,
      ...claims
    } = decode(token)
    return {
      principalId,
      scope,
      provider_id,
      user_email,
      jurisdictions,
      ...claims
    }
  },
  basic: (token: string) => {
    const [principalId, scope] = Buffer.from(token, 'base64').toString().split('|')
    return { principalId, scope, provider_id: principalId, user_email: principalId, jurisdictions: principalId }
  }
}

const BaseAuthorizer: Authorizer = authorization => {
  const [scheme, token] = authorization.split(' ')
  const decoder = decoders[scheme.toLowerCase()]
  return decoder ? decoder(token) : null
}

export const AuthorizationHeaderApiAuthorizer: ApiAuthorizer = req => {
  return req.headers?.authorization ? BaseAuthorizer(req.headers.authorization) : null
}

export const WebSocketAuthorizer = BaseAuthorizer
