import MDSDBPostgres from '../index'
import { dropTables, createTables } from '../migration'
import { AttachmentRepository } from '@mds-core/mds-attachment-service'
import { AuditRepository } from '@mds-core/mds-audit-service'
import { GeographyRepository } from '@mds-core/mds-geography-service'
import { IngestRepository } from '@mds-core/mds-ingest-service'
import { PolicyRepository } from '@mds-core/mds-policy-service'
import { PGInfo } from '../sql-utils'

const { env } = process

export async function initializeDB() {
  await Promise.all(
    [AttachmentRepository, AuditRepository, GeographyRepository, IngestRepository, PolicyRepository].map(repository =>
      repository.initialize()
    )
  )
  await dropTables()
  await createTables()
}

export async function shutdownDB() {
  await MDSDBPostgres.shutdown()
  await Promise.all(
    [AttachmentRepository, AuditRepository, GeographyRepository, IngestRepository, PolicyRepository].map(repository =>
      repository.shutdown()
    )
  )
}

export const pg_info: PGInfo = {
  database: env.PG_NAME,
  host: env.PG_HOST || 'localhost',
  user: env.PG_USER,
  password: env.PG_PASS,
  port: Number(env.PG_PORT) || 5432
}
