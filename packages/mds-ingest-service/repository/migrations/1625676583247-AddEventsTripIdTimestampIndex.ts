import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEventsTripIdTimestampIndex1625676583247 implements MigrationInterface {
  name = 'AddEventsTripIdTimestampIndex1625676583247'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_trip_id_timestamp_events" ON "events" ("trip_id", "timestamp") `
    )
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_timestamp_events" ON "events" ("timestamp") `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_trip_id_timestamp_events" `)
    await queryRunner.query(`DROP INDEX "idx_timestamp_events" `)
  }
}
