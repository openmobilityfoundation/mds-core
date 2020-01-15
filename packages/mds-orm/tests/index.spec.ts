import connection from './connection'
import audits from './audits'
import devices from './devices'

describe('Test ORM', () => {
  connection()
  audits()
  devices()
})
