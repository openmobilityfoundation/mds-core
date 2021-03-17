import { MigrationInterface, QueryRunner } from 'typeorm'

export class EventEntity1615994540391 implements MigrationInterface {
  name = 'EventEntity1615994540391'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX "idx_trip_id_events" ON "events" ("trip_id") `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_trip_id_events"`)
  }
}
