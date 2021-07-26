import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEventsTimestampIdIndex1627315083728 implements MigrationInterface {
  name = 'AddEventsTimestampIdIndex1627315083728'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_timestamp_id_events" on events(timestamp, id)`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_timestamp_id_events`)
  }
}
