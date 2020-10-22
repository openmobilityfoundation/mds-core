import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateEventsTable1603212540962 implements MigrationInterface {
  name = 'CreateEventsTable1603212540962'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [events] = await queryRunner.query(
      `SELECT "table_name" FROM information_schema.tables WHERE "table_catalog" = CURRENT_CATALOG AND "table_schema" = CURRENT_SCHEMA AND "table_name" = 'events'`
    )
    if (events === undefined) {
      await queryRunner.query(
        `CREATE TABLE "events" ("recorded" bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint, "id" bigint GENERATED ALWAYS AS IDENTITY, "device_id" uuid NOT NULL, "provider_id" uuid NOT NULL, "timestamp" bigint NOT NULL, "event_type" character varying(31) NOT NULL, "event_type_reason" character varying(31), "telemetry_timestamp" bigint, "trip_id" uuid, "service_area_id" uuid, CONSTRAINT "events_pkey" PRIMARY KEY ("device_id", "timestamp"))`
      )
      await queryRunner.query(`CREATE INDEX "idx_recorded_events" ON "events" ("recorded") `)
      await queryRunner.query(`CREATE UNIQUE INDEX "idx_id_events" ON "events" ("id") `)
    } else {
      await queryRunner.query(
        `ALTER TABLE "events" ALTER COLUMN "recorded" SET DEFAULT (extract(epoch from now()) * 1000)::bigint`
      )
      await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "event_type" SET NOT NULL`)
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_id_events"`)
    await queryRunner.query(`DROP INDEX "idx_recorded_events"`)
    await queryRunner.query(`DROP TABLE "events"`)
  }
}
