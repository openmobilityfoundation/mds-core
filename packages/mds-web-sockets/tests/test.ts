import WebSocket from 'ws'
import { MOCHA_PROVIDER_ID } from '@mds-core/mds-providers'
import { PROVIDER_SCOPES } from '@mds-core/mds-test-data'
import { WebSocketServer } from '../server'

const ADMIN_AUTH = `basic ${Buffer.from(`${MOCHA_PROVIDER_ID}|${PROVIDER_SCOPES}`).toString('base64')}`

before(() => {
  WebSocketServer()
})

describe('Tests MDS-Web-Sockets', () => {
  describe('Tests Authentication', () => {
    it('Tests admin:all scoped tokens can authenticate successfully', done => {
      const client = new WebSocket('ws://localhost:4009')
      client.onopen = () => {
        client.send(`AUTH%${ADMIN_AUTH}`)
      }

      client.on('message', data => {
        if (data === 'Authentication success!') {
          client.close()
          return done()
        }
        client.close()
        return done(data)
      })
    })
  })
})
