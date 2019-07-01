/* eslint-disable @typescript-eslint/no-object-literal-type-assertion */
import test from 'unit.js'
import { ApiGatewayRequest, ApiGatewayAuthorizer } from '../index'

describe('Test API Gateway Authorizer', () => {
  it('No Authorizaton', done => {
    const authorizer = ApiGatewayAuthorizer({} as ApiGatewayRequest)
    test.value(authorizer).is({})
    done()
  })

  it('No Event', done => {
    const authorizer = ApiGatewayAuthorizer({ apiGateway: {} } as ApiGatewayRequest)
    test.value(authorizer).is({})
    done()
  })

  it('No Request Context', done => {
    const authorizer = ApiGatewayAuthorizer({ apiGateway: { event: {} } } as ApiGatewayRequest)
    test.value(authorizer).is({})
    done()
  })

  it('No Authorizer', done => {
    const authorizer = ApiGatewayAuthorizer({
      apiGateway: { event: { requestContext: {} } }
    } as ApiGatewayRequest)
    test.value(authorizer).is({})
    done()
  })

  it('API Gateway Authorizaton', done => {
    const authorizer = ApiGatewayAuthorizer({
      apiGateway: { event: { requestContext: { authorizer: { principalId: 'principalId', scope: 'scope' } } } }
    } as ApiGatewayRequest)
    test
      .object(authorizer)
      .hasProperty('principalId', 'principalId')
      .hasProperty('scope', 'scope')
    done()
  })
})
