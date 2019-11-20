import db from '@mds-core/mds-db'
import connection from './connection'
import audits from './audits'
import devices from './devices'

before(async () => {
  await db.initialize()
})

after(async () => {
  await db.shutdown()
})

describe('Test ORM', () => {
  connection()
  audits()
  devices()
})
