import express from 'express'
import { UUID } from 'mds'

export interface ProviderApiRequest extends express.Request {
  apiGateway?: {
    event?: {
      requestContext?: {
        authorizer?: Partial<{
          principalId: string
          provider_id: UUID
          scope: string
          email: string
        }>
      }
    }
  }
}

// TODO use this instead of weird Partial<> blah blah
export interface AuthContext {
  provider_id: string
  scope: string
}
