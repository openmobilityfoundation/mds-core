import test from 'unit.js'
import uuid from 'uuid'
import { MOCHA_PROVIDER_ID } from '@mds-core/mds-providers'
import { getReadOnlyConnection, getReadWriteConnection } from '../connection'
import { AuditEntity } from '../entities/AuditEntity'

const records = 5_000
const recorded = Date.now()
const audit_device_id = uuid()

describe('Write/Read Audits', () => {
  it(records > 1 ? `Write ${records} Audits(s)` : 'Write Audit', async () => {
    const connection = await getReadWriteConnection()
    const audits = [...Array(records)].map((_, index) => ({
      audit_trip_id: uuid(),
      audit_subject_id: 'auditor@agency.city',
      audit_device_id,
      provider_id: MOCHA_PROVIDER_ID,
      provider_name: 'ORM Test Provider',
      provider_vehicle_id: `${Math.random()
        .toString(36)
        .substr(2, 3)
        .toUpperCase()}-${index.toString().padStart(6, '0')}`,
      provider_device_id: index % 2 === 0 ? uuid() : undefined,
      timestamp: recorded,
      recorded
    }))
    try {
      await connection.manager.save(AuditEntity, audits, { chunk: 5000 })
      test.value(audits.length).is(records)
    } finally {
      await connection.close()
    }
  })

  it(records > 1 ? `Read ${records} Audits(s)` : 'Read Audit', async () => {
    const connection = await getReadOnlyConnection()
    try {
      const audits = await connection.manager.find(AuditEntity, { where: { audit_device_id }, order: { id: 'ASC' } })
      test.value(audits.length).is(records)
    } finally {
      await connection.close()
    }
  })
})
