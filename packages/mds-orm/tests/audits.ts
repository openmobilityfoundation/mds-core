import test from 'unit.js'
import uuid from 'uuid'
import { MOCHA_PROVIDER_ID } from '@mds-core/mds-providers'
import { ConnectionManager } from '../connection'
import { AuditEntity } from '../entities/audit-entity'

const records = 5_000
const recorded = Date.now()
const audit_device_id = uuid()

const manager = ConnectionManager(AuditEntity)

export default () =>
  describe('Write/Read Audits', () => {
    it(records > 1 ? `Write ${records} Audits(s)` : 'Write Audit', async () => {
      const connection = await manager.getConnection('rw')
      const audits = Array.from({ length: records }, (_, index) => ({
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
        const repository = connection.getRepository(AuditEntity)
        const { raw: returning } = await repository
          .createQueryBuilder()
          .insert()
          .values(audits)
          .returning('*')
          .onConflict('DO NOTHING')
          .execute()
        test.value(returning.length).is(records)
      } finally {
        await connection.close()
      }
    })

    it(records > 1 ? `Read ${records} Audits(s)` : 'Read Audit', async () => {
      const connection = await manager.getConnection('ro')
      try {
        const audits = await connection.manager.find(AuditEntity, { where: { audit_device_id }, order: { id: 'ASC' } })
        test.value(audits.length).is(records)
      } finally {
        await connection.close()
      }
    })
  })
