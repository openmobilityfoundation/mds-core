/* eslint-disable no-console */
import { verify } from 'jsonwebtoken'
import { Handler } from 'aws-lambda'
import { ApiAuthorizerClaims } from 'mds-api-authorizer'

const {
  AUTH0_CLIENT_PUBLIC_KEY = '',
  AUTH0_API_IDENTIFIER = '',
  TOKEN_ISSUER = '',
  TOKEN_PROVIDER_ID_CLAIM = 'https://ladot.io/provider_id'
} = process.env

// Policy helper function
const generatePolicy = (
  principalId: string,
  context: Required<Omit<ApiAuthorizerClaims, 'principalId'>>,
  effect = 'Allow',
  resource = '*'
) => ({
  principalId,
  policyDocument: {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource
      }
    ]
  },
  context
})

// Reusable Authorizer function
export const handler: Handler<{ authorizationToken: string }, ReturnType<typeof generatePolicy>> = (
  event,
  context,
  callback
) => {
  console.log('event', event)
  if (!event.authorizationToken) {
    return callback('Unauthorized')
  }

  const [scheme, token] = event.authorizationToken.split(' ')

  if (!(scheme.toLowerCase() === 'bearer' && token)) {
    // no auth token!
    return callback('Unauthorized')
  }

  const options = {
    audience: AUTH0_API_IDENTIFIER,
    issuer: TOKEN_ISSUER
  }

  try {
    verify(token, AUTH0_CLIENT_PUBLIC_KEY.split('\\n').join('\n'), options, (verifyError, decoded) => {
      if (verifyError || typeof decoded !== 'object') {
        console.log('verifyError', verifyError)
        // 401 Unauthorized
        console.log(`Token invalid. ${verifyError}`)
        return callback('Unauthorized')
      }
      // is custom authorizer function
      console.log('valid from customAuthorizer', decoded)

      const { sub: principalId, scope, [TOKEN_PROVIDER_ID_CLAIM]: provider_id, email } = decoded as {
        [c: string]: string
      }

      return callback(null, generatePolicy(principalId, { provider_id, scope, email }))
    })
  } catch (err) {
    console.log('catch error. Invalid token', err)
    return callback('Unauthorized')
  }
}
