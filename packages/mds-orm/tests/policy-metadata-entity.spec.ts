import test from 'unit.js'
import { POLICY_UUID } from '@mds-core/mds-test-data'
import { ConnectionManager } from '../connection'
import { PolicyMetadataEntity } from '../entities/policy-metadata-entity'

const manager = ConnectionManager(PolicyMetadataEntity)

describe('Write/Read Policies', () => {
  it('writes and reads a Policy', async () => {
    const RWConnection = await manager.getConnection('rw')
    try {
      const repository = RWConnection.getRepository(PolicyMetadataEntity)
      await repository
        .createQueryBuilder()
        .insert()
        .values([{ policy_id: POLICY_UUID, policy_metadata: {} }])
        .onConflict('DO NOTHING')
        .execute()
    } finally {
      await RWConnection.close()
    }
    const ROConnection = await manager.getConnection('ro')
    try {
      const policy_metadata = await ROConnection.manager.find(PolicyMetadataEntity, {
        where: { policy_id: POLICY_UUID }
      })
      test.value(policy_metadata.length).is(1)
    } finally {
      await ROConnection.close()
    }
  })
})
