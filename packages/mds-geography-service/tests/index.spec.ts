import { GeographyServiceManager } from '../service/manager'
import { GeographyServiceClient } from '../client'
import { GeographyRepository } from '../repository'

describe('Geography Repository Tests', () => {
  beforeAll(async () => {
    await GeographyRepository.initialize()
  })

  it('Run Migrations', async () => {
    await GeographyRepository.runAllMigrations()
  })

  it('Revert Migrations', async () => {
    await GeographyRepository.revertAllMigrations()
  })

  afterAll(async () => {
    await GeographyRepository.shutdown()
  })
})

const GeographyServer = GeographyServiceManager.controller()

describe('Geography Service Tests', () => {
  beforeAll(async () => {
    await GeographyServer.start()
  })

  it('Test Name Method', async () => {
    const name = await GeographyServiceClient.name()
    expect(name).toEqual('mds-geography-service')
  })

  afterAll(async () => {
    await GeographyServer.stop()
  })
})
