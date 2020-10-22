import logger from '@mds-core/mds-logger'
import { AttachmentRepository } from '@mds-core/mds-attachment-service'
import { GeographyRepository } from '@mds-core/mds-geography-service'
import { IngestRepository } from '@mds-core/mds-ingest-service'
import { PolicyRepository } from '@mds-core/mds-policy-service'
import { AuditRepository } from '@mds-core/mds-audit-service'

async function dropTables() {
  await Promise.all(
    [AttachmentRepository, AuditRepository, GeographyRepository, IngestRepository, PolicyRepository].map(repository =>
      repository.revertAllMigrations()
    )
  )
  logger.info(`postgres drop table succeeded`)
}

async function createTables() {
  await Promise.all(
    [AttachmentRepository, AuditRepository, GeographyRepository, IngestRepository, PolicyRepository].map(repository =>
      repository.runAllMigrations()
    )
  )
  logger.info('postgres create tables suceeded')
}

export { dropTables, createTables }
