import { IngestServiceManager } from '../service/manager'
import { IngestServiceClient } from '../client'
import { IngestRepository } from '../repository'

describe('Ingest Repository Tests', () => {
  beforeAll(async () => {
    await IngestRepository.initialize()
  })

  it('Run Migrations', async () => {
    await IngestRepository.runAllMigrations()
  })

  it('Revert Migrations', async () => {
    await IngestRepository.revertAllMigrations()
  })

  afterAll(async () => {
    await IngestRepository.shutdown()
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
