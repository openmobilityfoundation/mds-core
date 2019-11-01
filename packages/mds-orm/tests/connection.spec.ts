import test from 'unit.js'
import { getReadOnlyConnection, getReadWriteConnection } from '../connection'

describe('Test ORM', () => {
  it('Create R/W Connection', async () => {
    const connection = await getReadWriteConnection()
    test.value(connection.isConnected).is(true)
    await connection.close()
    test.value(connection.isConnected).is(false)
  })

  it('Create R/O Connection', async () => {
    const connection = await getReadOnlyConnection()
    test.value(connection.isConnected).is(true)
    await connection.close()
    test.value(connection.isConnected).is(false)
  })
})
