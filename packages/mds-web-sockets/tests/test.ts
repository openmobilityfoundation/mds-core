/* eslint-reason need to have multiline RSA key */
/* eslint-disable no-multi-str */
import WebSocket from 'ws'
import { MOCHA_PROVIDER_ID } from '@mds-core/mds-providers'
import { PROVIDER_SCOPES } from '@mds-core/mds-test-data'
import Sinon from 'sinon'
import jwt from 'jsonwebtoken'
import NodeRSA from 'node-rsa'
import { WebSocketServer } from '../server'
import { Clients } from '../clients'

const JWT_AUDIENCE = 'https://example.com'
const JWT_ISSUER = 'https://example.com'

process.env.JWT_AUDIENCE = JWT_AUDIENCE
process.env.TOKEN_ISSUER = JWT_ISSUER

const key = new NodeRSA({ b: 512 })

const RSA_PRIVATE_KEY = key.exportKey('private')
const RSA_PUBLIC_KEY = key.exportKey('public')

const returnRsaPublicKey = async () => RSA_PUBLIC_KEY

const goodToken = jwt.sign({ provider_id: MOCHA_PROVIDER_ID, scope: PROVIDER_SCOPES }, RSA_PRIVATE_KEY, {
  algorithm: 'RS256',
  audience: 'https://example.com',
  issuer: 'https://example.com'
})

const ADMIN_AUTH = `Bearer ${goodToken}`

before(() => {
  Sinon.stub(Clients, 'getKey').returns(returnRsaPublicKey())
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

    it('Tests invalid audience tokens cannot authenticate successfully', done => {
      const badToken = jwt.sign({ provider_id: MOCHA_PROVIDER_ID, scope: PROVIDER_SCOPES }, RSA_PRIVATE_KEY, {
        algorithm: 'RS256',
        audience: 'https://foo.com',
        issuer: 'https://foo.com'
      })

      const BAD_AUTH = `Bearer ${badToken}`

      const client = new WebSocket('ws://localhost:4009')
      client.onopen = () => {
        client.send(`AUTH%${BAD_AUTH}`)
      }

      client.on('message', data => {
        if (data === '{"err":{"name":"AuthorizationError"}}') {
          client.close()
          return done()
        }
        client.close()
        return done(data)
      })
    })
  })
})
