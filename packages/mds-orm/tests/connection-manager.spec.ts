import test from 'unit.js'
import { ConnectionManager } from '../connection-manager'

const manager = ConnectionManager()

describe('Test Connection', () => {
  before(async () => {
    await manager.initialize()
  })

  it('Create R/W Connection', async () => {
    const connection = await manager.getReadWriteConnection()
    test.value(connection.name).is('rw')
    test.value(connection.isConnected).is(true)
    await connection.close()
    test.value(connection.isConnected).is(false)
    const reused = await manager.getReadWriteConnection()
    test.value(connection).is(reused)
    test.value(connection.isConnected).is(true)
    await connection.close()
    test.value(connection.isConnected).is(false)
  })

  it('Create R/O Connection', async () => {
    const connection = await manager.getReadOnlyConnection()
    test.value(connection.name).is('ro')
    test.value(connection.isConnected).is(true)
    await connection.close()
    test.value(connection.isConnected).is(false)
    const reused = await manager.getReadOnlyConnection()
    test.value(connection).is(reused)
    test.value(connection.isConnected).is(true)
    await connection.close()
    test.value(connection.isConnected).is(false)
  })

  after(async () => {
    await manager.shutdown()
  })
})
