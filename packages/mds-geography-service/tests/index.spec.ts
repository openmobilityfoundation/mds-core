import { GeographyServiceManager } from '../service/manager'
import { GeographyServiceClient } from '../client'
import { GeographyRepository } from '../repository'

describe('Test Migrations', () => {
  it('Run Migrations', async () => {
    await GeographyRepository.runAllMigrations()
  })

  it('Revert Migrations', async () => {
    await GeographyRepository.revertAllMigrations()
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
