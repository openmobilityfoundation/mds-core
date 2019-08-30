/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-reason avoids import of logger */
/* eslint-disable no-console */
import { verify } from 'jsonwebtoken'
import { Handler, CustomAuthorizerResult } from 'aws-lambda'
import { ApiAuthorizerClaims } from '@mds-core/mds-api-authorizer'

// These environment variables MUST be set
const {
  TOKEN_PUBLIC_KEY = '', // X.509 Certificate for verifying signature
  TOKEN_AUDIENCE = '', // Space delimited list of audiences
  TOKEN_ISSUER = '', // Token issuer
  TOKEN_PROVIDER_ID_CLAIM = 'https://ladot.io/provider_id', // Custom provider_id claim in access token
  TOKEN_USER_EMAIL_CLAIM = 'https://ladot.io/user_email' // Custom user_email claim in access token
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
        const decoded = verify(token, TOKEN_PUBLIC_KEY.split('\\n').join('\n'), {
          audience: TOKEN_AUDIENCE.split(' '),
          issuer: TOKEN_ISSUER
        })
        if (typeof decoded === 'object') {
          const {
            sub: principalId,
            scope,
            [TOKEN_PROVIDER_ID_CLAIM]: provider_id,
            [TOKEN_USER_EMAIL_CLAIM]: user_email,
            email // Support getting email from previously issued id_tokens
          } = decoded as JWT
          console.log('Authorization Succeeded:', event.methodArn, principalId)
          callback(null, generatePolicy(principalId, { provider_id, scope, user_email: user_email || email }))
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
