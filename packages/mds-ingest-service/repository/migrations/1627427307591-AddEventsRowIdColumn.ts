import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEventsRowIdColumn1627427307591 implements MigrationInterface {
  name = 'AddEventsRowIdColumn1627427307591'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "event_annotations" ADD "events_row_id" bigint DEFAULT NULL`)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_events_row_id_event_annotations" ON "event_annotations" ("events_row_id")`
    )
    await queryRunner.query(
      `UPDATE event_annotations SET events_row_id = events.id FROM events WHERE event_annotations.device_id = events.device_id AND event_annotations.timestamp = events.timestamp`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_events_row_id_event_annotations"`)
    await queryRunner.query(`ALTER TABLE "event_annotations" DROP COLUMN "events_row_id"`)
  }
}
