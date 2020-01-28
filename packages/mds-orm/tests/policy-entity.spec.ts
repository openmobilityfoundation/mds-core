import test from 'unit.js'
import { POLICY_JSON } from '@mds-core/mds-test-data'
import { ConnectionManager } from '../connection'
import { PolicyEntity } from '../entities/policy-entity'

const manager = ConnectionManager(PolicyEntity)

describe('Write/Read Policies', () => {
  it('writes and reads a Policy', async () => {
    const RWConnection = await manager.getConnection('rw')
    try {
      const repository = RWConnection.getRepository(PolicyEntity)
      await repository
        .createQueryBuilder()
        .insert()
        .values([{ policy_id: POLICY_JSON.policy_id, policy_json: POLICY_JSON }])
        .onConflict('DO NOTHING')
        .execute()
    } finally {
      await RWConnection.close()
    }
    const ROConnection = await manager.getConnection('ro')
    try {
      const policies = await ROConnection.manager.find(PolicyEntity, { where: { policy_id: POLICY_JSON.policy_id } })
      test.value(policies.length).is(1)
    } finally {
      await ROConnection.close()
    }
  })
})
