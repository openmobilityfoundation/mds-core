import { AuthorizationError } from '@mds-core/mds-utils'
import WebSocket from 'ws'

const OPERATIONS = ['AUTH', 'SUB', 'PUSH'] as const
type OPERATION = typeof OPERATIONS[number]

const buildMsg = (op: OPERATION, data: object, entity?: string) => {
  if (entity) {
    return `${op}%${entity}%${JSON.stringify(data)}`
  }

  return `${op}%${JSON.stringify(data)}`
}

export const wsSend = (client: WebSocket) => ({
  authResponse: () => ({
    error: () => client.send(buildMsg('AUTH', { err: new AuthorizationError() })),
    success: () => client.send(buildMsg('AUTH', { status: 'Success' }))
  }),
  push: (entity: string) => ({
    /**
     * @deprecated Retaining purely for backwards-compatibility
     */
    legacy: (data: object) => client.send(`${entity}%${JSON.stringify(data)}`),

    /*
    Duplicate methods in here in preparation for a future protocol refactor
    */
    success: (data: object) => client.send(buildMsg('PUSH', data, entity)),
    error: (data: object) => client.send(buildMsg('PUSH', data, entity))
  }),
  subResponse: (entity: string) => ({
    error: () => client.send(buildMsg('SUB', { status: 'Failure' }, entity)),
    success: () => client.send(buildMsg('SUB', { status: 'Success' }, entity))
  })
})
