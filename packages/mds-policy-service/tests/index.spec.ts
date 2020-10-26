import { PolicyServiceManager } from '../service/manager'
import { PolicyServiceClient } from '../client'
import { PolicyRepository } from '../repository'

describe('Policy Repository Tests', () => {
  beforeAll(async () => {
    await PolicyRepository.initialize()
  })

  it('Run Migrations', async () => {
    await PolicyRepository.runAllMigrations()
  })

  it('Revert Migrations', async () => {
    await PolicyRepository.revertAllMigrations()
  })

  afterAll(async () => {
    await PolicyRepository.shutdown()
  })
})

const PolicyServer = PolicyServiceManager.controller()

describe('Policy Service Tests', () => {
  beforeAll(async () => {
    await PolicyServer.start()
  })

  it('Test Name Method', async () => {
    const name = await PolicyServiceClient.name()
    expect(name).toEqual('mds-policy-service')
  })

  afterAll(async () => {
    await PolicyServer.stop()
  })
})
