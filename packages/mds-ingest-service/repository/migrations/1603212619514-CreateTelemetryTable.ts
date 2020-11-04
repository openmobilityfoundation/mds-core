import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateTelemetryTable1603212619514 implements MigrationInterface {
  name = 'CreateTelemetryTable1603212619514'

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('telemetry'))) {
      await queryRunner.query(
        `CREATE TABLE "telemetry" ("recorded" bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint, "id" bigint GENERATED ALWAYS AS IDENTITY, "device_id" uuid NOT NULL, "provider_id" uuid NOT NULL, "timestamp" bigint NOT NULL, "lat" double precision NOT NULL, "lng" double precision NOT NULL, "speed" real, "heading" real, "accuracy" real, "altitude" real, "charge" real, CONSTRAINT "telemetry_pkey" PRIMARY KEY ("device_id", "timestamp"))`
      )
      await queryRunner.query(`CREATE INDEX "idx_recorded_telemetry" ON "telemetry" ("recorded") `)
      await queryRunner.query(`CREATE UNIQUE INDEX "idx_id_telemetry" ON "telemetry" ("id") `)
    } else {
      await queryRunner.query(
        `ALTER TABLE "telemetry" ALTER COLUMN "recorded" SET DEFAULT (extract(epoch from now()) * 1000)::bigint`
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_id_telemetry"`)
    await queryRunner.query(`DROP INDEX "idx_recorded_telemetry"`)
    await queryRunner.query(`DROP TABLE "telemetry"`)
  }
}
