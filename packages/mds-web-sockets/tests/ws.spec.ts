/* eslint-reason need to have multiline RSA key */
/* eslint-disable no-multi-str */
import WebSocket from 'ws'
import { MOCHA_PROVIDER_ID } from '@mds-core/mds-providers'
import jwt from 'jsonwebtoken'
import NodeRSA from 'node-rsa'
import stream, { StreamProducer } from '@mds-core/mds-stream'
import { Msg, NatsError } from 'ts-nats'
import { SingleOrArray } from '@mds-core/mds-types'
import { AuthorizationError } from '@mds-core/mds-utils'
import { WebSocketServer } from '../ws-server'
import { Clients } from '../clients'

const JWT_AUDIENCE = 'https://example.com'
const JWT_ISSUER = 'https://example.com'

process.env.JWT_AUDIENCE = JWT_AUDIENCE
process.env.TOKEN_ISSUER = JWT_ISSUER

const key = new NodeRSA({ b: 512 })

const RSA_PRIVATE_KEY = key.exportKey('private')
const RSA_PUBLIC_KEY = key.exportKey('public')

const returnRsaPublicKey = async () => RSA_PUBLIC_KEY

const readOnlyToken = jwt.sign(
  { provider_id: MOCHA_PROVIDER_ID, scope: 'events:read telemetry:read' },
  RSA_PRIVATE_KEY,
  {
    algorithm: 'RS256',
    audience: 'https://example.com',
    issuer: 'https://example.com'
  }
)

const readOnlyAuth = `Bearer ${readOnlyToken}`

const readWriteToken = jwt.sign(
  { provider_id: MOCHA_PROVIDER_ID, scope: 'events:read events:write telemetry:read telemetry:write' },
  RSA_PRIVATE_KEY,
  {
    algorithm: 'RS256',
    audience: 'https://example.com',
    issuer: 'https://example.com'
  }
)

const readWriteAuth = `Bearer ${readWriteToken}`

/* Callbacks to use for stream operations. Set by consumers, used by producers. */
const streamCallbacks: Partial<{ [e: string]: ((err: NatsError | null, msg: Msg) => void)[] }> = {}

/* Can't use the existing mock stream producer, because we use unnamed producers in a hash map for the WS Server */
const mockProducer: (topic: string) => StreamProducer<object> = topic => {
  return {
    write: async (message: SingleOrArray<object>) => {
      const callbacks = streamCallbacks[topic]
      if (callbacks) {
        const messages = (Array.isArray(message) ? message : [message]).map(msg => {
          return JSON.stringify(msg)
        })

        /* eslint-disable promise/prefer-await-to-callbacks */
        await Promise.all(
          messages.map(msg => callbacks.map(cb => cb(null, { subject: topic, data: msg, sid: 0, size: 1 })))
        )
        /* eslint-enable promise/prefer-await-to-callbacks */
      }
    },
    initialize: async () => undefined,
    shutdown: async () => undefined
  }
}

const mockConsumer = (topics: string | string[], processor: (err: NatsError | null, msg: Msg) => void) => {
  if (Array.isArray(topics)) {
    topics.forEach(topic => {
      streamCallbacks[topic] = (streamCallbacks[topic] ?? []).concat(processor)
    })
  } else {
    streamCallbacks[topics] = (streamCallbacks[topics] ?? []).concat(processor)
  }
  return {
    initialize: async () => undefined,
    shutdown: async () => undefined
  }
}

const server = WebSocketServer().controller()

beforeAll(() => {
  jest.spyOn(Clients, 'getKey').mockImplementation(returnRsaPublicKey)
  jest.spyOn(stream, 'NatsStreamProducer').mockImplementation(mockProducer as any) // need to cast cause jest infers StreamProducer<unknown> ¯\_(ツ)_/¯
  jest.spyOn(stream, 'NatsStreamConsumer').mockImplementation(mockConsumer)
  /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
  server.start()
})

afterAll(async () => {
  await server.stop()
})

describe('Tests MDS-Web-Sockets', () => {
  describe('Tests Authentication', () => {
    it('Tests readonly tokens can authenticate successfully', done => {
      const client = new WebSocket(`ws://localhost:${process.env.PORT || 4000}`)
      client.onopen = () => {
        client.send(`AUTH%${readOnlyAuth}`)
      }

      client.on('message', data => {
        if (data === 'AUTH%{"status":"Success"}') {
          client.close()
          return done()
        }
        client.close()
        return done(data)
      })
    })

    it('Tests invalid audience tokens cannot authenticate successfully', done => {
      const badToken = jwt.sign({ provider_id: MOCHA_PROVIDER_ID, scope: 'admin:all' }, RSA_PRIVATE_KEY, {
        algorithm: 'RS256',
        audience: 'https://foo.com',
        issuer: 'https://foo.com'
      })

      const BAD_AUTH = `Bearer ${badToken}`

      const client = new WebSocket(`ws://localhost:${process.env.PORT || 4000}`)
      client.onopen = () => {
        client.send(`AUTH%${BAD_AUTH}`)
      }

      client.on('message', data => {
        if (data === 'AUTH%{"err":{"name":"AuthorizationError"}}') {
          client.close()
          return done()
        }
        client.close()
        return done(data)
      })
    })

    describe('Tests Readonly Client Access', () => {
      it('Tests readonly clients can subscribe, but cannot send events', done => {
        const client = new WebSocket(`ws://localhost:${process.env.PORT || 4000}`)
        client.onopen = () => {
          client.send(`AUTH%${readOnlyAuth}`)
        }

        client.on('message', data => {
          if (data === 'AUTH%{"status":"Success"}') {
            client.send('SUB%event')
            return
          }

          if (data === 'SUB%event%{"status":"Success"}') {
            client.send(`PUSH%event%${JSON.stringify({ foo: 'bar' })}`)
            return
          }

          if (data === `PUSH%event%${JSON.stringify({ err: new AuthorizationError('Insufficient access.') })}`) {
            client.close()
            return done()
          }

          return done
        })
      })

      it('Tests readonly clients can subscribe, but cannot send telemetry', done => {
        const client = new WebSocket(`ws://localhost:${process.env.PORT || 4000}`)
        client.onopen = () => {
          client.send(`AUTH%${readOnlyAuth}`)
        }

        client.on('message', data => {
          if (data === 'AUTH%{"status":"Success"}') {
            client.send('SUB%telemetry')
            return
          }

          if (data === 'SUB%telemetry%{"status":"Success"}') {
            client.send(`PUSH%telemetry%${JSON.stringify({ foo: 'bar' })}`)
            return
          }

          if (data === `PUSH%telemetry%${JSON.stringify({ err: new AuthorizationError('Insufficient access.') })}`) {
            client.close()
            return done()
          }

          return done
        })
      })
    })

    // FIXME Remove once legacy push support is removed
    describe('Tests legacy server -> client emission', () => {
      it('Tests r/w clients can subscribe and send events (legacy)', done => {
        const client = new WebSocket(`ws://localhost:${process.env.PORT || 4000}`)
        client.onopen = () => {
          client.send(`AUTH%${readWriteAuth}`)
        }

        client.on('message', data => {
          if (data === 'AUTH%{"status":"Success"}') {
            client.send('SUB%event')
            return
          }

          if (data === 'SUB%event%{"status":"Success"}') {
            client.send(`PUSH%event%${JSON.stringify({ foo: 'bar' })}`)
            return
          }

          if (data === 'event%{"foo":"bar"}') {
            client.close()
            return done()
          }

          return done
        })
      })

      it('Tests r/w clients can subscribe and send telemetry (legacy)', done => {
        const client = new WebSocket(`ws://localhost:${process.env.PORT || 4000}`)
        client.onopen = () => {
          client.send(`AUTH%${readWriteAuth}`)
        }

        client.on('message', data => {
          if (data === 'AUTH%{"status":"Success"}') {
            client.send('SUB%telemetry')
            return
          }

          if (data === 'SUB%telemetry%{"status":"Success"}') {
            client.send(`PUSH%telemetry%${JSON.stringify({ foo: 'bar' })}`)
            return
          }

          if (data === 'telemetry%{"foo":"bar"}') {
            client.close()
            return done()
          }

          return done
        })
      })
    })

    describe('Tests Read/Write Clients', () => {
      it('Tests r/w clients can subscribe and send events', done => {
        const client = new WebSocket(`ws://localhost:${process.env.PORT || 4000}`)
        client.onopen = () => {
          client.send(`AUTH%${readWriteAuth}`)
        }

        client.on('message', data => {
          if (data === 'AUTH%{"status":"Success"}') {
            client.send('SUB%event')
            return
          }

          if (data === 'SUB%event%{"status":"Success"}') {
            client.send(`PUSH%event%${JSON.stringify({ foo: 'bar' })}`)
            return
          }

          if (data === 'PUSH%event%{"foo":"bar"}') {
            client.close()
            return done()
          }

          return done
        })
      })

      it('Tests r/w clients can subscribe and send telemetry', done => {
        const client = new WebSocket(`ws://localhost:${process.env.PORT || 4000}`)
        client.onopen = () => {
          client.send(`AUTH%${readWriteAuth}`)
        }

        client.on('message', data => {
          if (data === 'AUTH%{"status":"Success"}') {
            client.send('SUB%telemetry')
            return
          }

          if (data === 'SUB%telemetry%{"status":"Success"}') {
            client.send(`PUSH%telemetry%${JSON.stringify({ foo: 'bar' })}`)
            return
          }

          if (data === 'PUSH%telemetry%{"foo":"bar"}') {
            client.close()
            return done()
          }

          return done
        })
      })
    })
  })
})
