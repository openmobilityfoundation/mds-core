import { AttachmentServiceManager } from '../service/manager'
import { AttachmentServiceClient } from '../client'
import { AttachmentRepository } from '../repository'

describe('Test Migrations', () => {
  it('Run Migrations', async () => {
    await AttachmentRepository.runAllMigrations()
  })

  it('Revert Migrations', async () => {
    await AttachmentRepository.revertAllMigrations()
  })
})

const AttachmentServer = AttachmentServiceManager.controller()

describe('Attachment Service Tests', () => {
  beforeAll(async () => {
    await AttachmentServer.start()
  })

  it('Test Name Method', async () => {
    const name = await AttachmentServiceClient.name()
    expect(name).toEqual('mds-attachment-service')
  })

  afterAll(async () => {
    await AttachmentServer.stop()
  })
})
