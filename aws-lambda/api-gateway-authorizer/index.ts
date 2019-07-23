/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-reason avoids import of logger */
/* eslint-disable no-console */
import { verify } from 'jsonwebtoken'
import { Handler, CustomAuthorizerResult } from 'aws-lambda'
import { ApiAuthorizerClaims } from 'mds-api-authorizer'

const {
  AUTH0_CLIENT_PUBLIC_KEY = '',
  AUTH0_API_IDENTIFIER = '',
  TOKEN_ISSUER = '',
  TOKEN_PROVIDER_ID_CLAIM = 'https://ladot.io/provider_id'
} = process.env

type AuthResponseContext = Required<Omit<ApiAuthorizerClaims, 'principalId'>>

// Policy helper function
const generatePolicy = (
  principalId: string,
  context: AuthResponseContext,
  effect = 'Allow',
  resource = '*'
): CustomAuthorizerResult => ({
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

interface JWT {
  [claim: string]: string
}

// Reusable Authorizer function
export const handler: Handler<
  { type: 'TOKEN'; methodArn: string; authorizationToken: string },
  CustomAuthorizerResult
> = (event, context, callback) => {
  if (event.type === 'TOKEN' && event.authorizationToken) {
    const [scheme, token] = event.authorizationToken.split(' ')
    if (scheme.toLowerCase() === 'bearer' && token) {
      try {
        const decoded = verify(token, AUTH0_CLIENT_PUBLIC_KEY.split('\\n').join('\n'), {
          audience: AUTH0_API_IDENTIFIER,
          issuer: TOKEN_ISSUER
        })
        if (typeof decoded === 'object') {
          const { sub: principalId, scope, [TOKEN_PROVIDER_ID_CLAIM]: provider_id, email } = decoded as JWT
          console.log('Authorization Succeeded:', event.methodArn, principalId)
          callback(null, generatePolicy(principalId, { provider_id, scope, email }))
          return
        }
      } catch (err) {
        console.log('Token Verification Failed:', err.message)
      }
    }
  }
  console.log('Authorization Failed', event)
  callback('Unauthorized')
}
