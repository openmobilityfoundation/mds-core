import express from 'express'
import { UUID } from 'mds'
export interface ComplianceApiRequest extends express.Request {
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
