import { AuditServiceManager } from '../service/manager'
import { AuditServiceClient } from '../client'
import { AuditRepository } from '../repository'

describe('Test Migrations', () => {
  it('Run Migrations', async () => {
    await AuditRepository.runAllMigrations()
  })

  it('Revert Migrations', async () => {
    await AuditRepository.revertAllMigrations()
  })
})

const AuditServer = AuditServiceManager.controller()

describe('Audit Service Tests', () => {
  beforeAll(async () => {
    await AuditServer.start()
  })

  it('Test Name Method', async () => {
    const name = await AuditServiceClient.name()
    expect(name).toEqual('mds-audit-service')
  })

  afterAll(async () => {
    await AuditServer.stop()
  })
})
