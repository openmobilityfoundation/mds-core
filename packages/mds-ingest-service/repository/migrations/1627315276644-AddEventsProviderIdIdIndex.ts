import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEventsProviderIdIdIndex1627315276644 implements MigrationInterface {
  name = 'AddEventsProviderIdIdIndex1627315276644'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_provider_id_id_events" on events(provider_id, id)`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_provider_id_id_events`)
  }
}
