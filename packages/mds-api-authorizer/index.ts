/**
 * Copyright 2019 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { UUID } from '@mds-core/mds-types'
import { getEnvVar } from '@mds-core/mds-utils'
import express from 'express'
import jwt from 'jsonwebtoken'

export interface AuthorizerClaims {
  principalId: string
  scope: string
  provider_id: UUID | null
  user_email: string | null
  jurisdictions: string | null
}

export type Authorizer = (authorization: string) => AuthorizerClaims | null
export type ApiAuthorizer = (req: express.Request) => AuthorizerClaims | null

export const CustomClaim = (claim: 'provider_id' | 'user_email' | 'jurisdictions') => {
  const { TOKEN_CUSTOM_CLAIM_NAMESPACE } = getEnvVar({
    TOKEN_CUSTOM_CLAIM_NAMESPACE: 'https://openmobilityfoundation.org'
  })
  return `${TOKEN_CUSTOM_CLAIM_NAMESPACE}${TOKEN_CUSTOM_CLAIM_NAMESPACE.endsWith('/') ? '' : '/'}${claim}`
}

export const ProviderIdClaim = () => {
  const { TOKEN_PROVIDER_ID_CLAIM } = getEnvVar({
    TOKEN_PROVIDER_ID_CLAIM: CustomClaim('provider_id')
  })
  return TOKEN_PROVIDER_ID_CLAIM
}

export const UserEmailClaim = () => {
  const { TOKEN_USER_EMAIL_CLAIM } = getEnvVar({
    TOKEN_USER_EMAIL_CLAIM: CustomClaim('user_email')
  })
  return TOKEN_USER_EMAIL_CLAIM
}

export const JurisdictionsClaim = () => {
  const { TOKEN_JURISDICTIONS_CLAIM } = getEnvVar({
    TOKEN_JURISDICTIONS_CLAIM: CustomClaim('jurisdictions')
  })
  return TOKEN_JURISDICTIONS_CLAIM
}

const decode = (token: string) => {
  const decoded = jwt.decode(token)
  return typeof decoded === 'string' || decoded === null ? {} : decoded
}

const decoders: { [scheme: string]: (token: string) => AuthorizerClaims } = {
  bearer: (token: string) => {
    const {
      sub: principalId,
      scope,
      [ProviderIdClaim()]: provider_id = null,
      [UserEmailClaim()]: user_email = null,
      [JurisdictionsClaim()]: jurisdictions = null,
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
