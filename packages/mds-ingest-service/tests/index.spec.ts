import { IngestServiceManager } from '../service/manager'
import { IngestServiceClient } from '../client'
import { IngestRepository } from '../repository'

describe('Test Migrations', () => {
  it('Run Migrations', async () => {
    await IngestRepository.runAllMigrations()
  })

  it('Revert Migrations', async () => {
    await IngestRepository.revertAllMigrations()
  })
})

const IngestServer = IngestServiceManager.controller()

describe('Ingest Service Tests', () => {
  beforeAll(async () => {
    await IngestServer.start()
  })

  it('Test Name Method', async () => {
    const name = await IngestServiceClient.name()
    expect(name).toEqual('mds-ingest-service')
  })

  afterAll(async () => {
    await IngestServer.stop()
  })
})
