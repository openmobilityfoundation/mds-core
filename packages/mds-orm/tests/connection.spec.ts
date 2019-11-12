import test from 'unit.js'
import { ConnectionManager } from '../connection'

const manager = ConnectionManager()

describe('Test ORM', () => {
  it('Create R/W Connection', async () => {
    const connection = await manager.getConnection('rw')
    test.value(connection.name).is('rw')
    test.value(connection.isConnected).is(true)
    await connection.close()
    test.value(connection.isConnected).is(false)
    const reused = await manager.getConnection('rw')
    test.value(connection).is(reused)
    test.value(connection.isConnected).is(true)
    await connection.close()
    test.value(connection.isConnected).is(false)
  })

  it('Create R/O Connection', async () => {
    const connection = await manager.getConnection('ro')
    test.value(connection.name).is('ro')
    test.value(connection.isConnected).is(true)
    await connection.close()
    test.value(connection.isConnected).is(false)
    const reused = await manager.getConnection('ro')
    test.value(connection).is(reused)
    test.value(connection.isConnected).is(true)
    await connection.close()
    test.value(connection.isConnected).is(false)
  })
})
