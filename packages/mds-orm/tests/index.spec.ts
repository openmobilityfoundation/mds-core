import connection from './connection'
import audits from './audits'
import devices from './devices'
import policies from './policies'
import policymetadata from './policy-metadata'

describe('Test ORM', () => {
  connection()
  audits()
  devices()
  policies()
  policymetadata()
})
