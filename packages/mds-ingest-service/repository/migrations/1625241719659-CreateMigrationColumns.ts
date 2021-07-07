import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateMigrationColumns1625241719659 implements MigrationInterface {
  name = 'CreateMigrationColumns1625241719659'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "devices" ADD "migrated_from_source" character varying(31)`)
    await queryRunner.query(`ALTER TABLE "devices" ADD "migrated_from_version" character varying(31)`)
    await queryRunner.query(`ALTER TABLE "devices" ADD "migrated_from_id" bigint`)
    await queryRunner.query(`ALTER TABLE "events" ADD "migrated_from_source" character varying(31)`)
    await queryRunner.query(`ALTER TABLE "events" ADD "migrated_from_version" character varying(31)`)
    await queryRunner.query(`ALTER TABLE "events" ADD "migrated_from_id" bigint`)
    await queryRunner.query(`ALTER TABLE "telemetry" ADD "migrated_from_source" character varying(31)`)
    await queryRunner.query(`ALTER TABLE "telemetry" ADD "migrated_from_version" character varying(31)`)
    await queryRunner.query(`ALTER TABLE "telemetry" ADD "migrated_from_id" bigint`)
    await queryRunner.query(`CREATE INDEX "idx_migrated_from_source_devices" ON "devices" ("migrated_from_source") `)
    await queryRunner.query(`CREATE INDEX "idx_migrated_from_version_devices" ON "devices" ("migrated_from_version") `)
    await queryRunner.query(`CREATE INDEX "idx_migrated_from_id_devices" ON "devices" ("migrated_from_id") `)
    await queryRunner.query(`CREATE INDEX "idx_migrated_from_source_events" ON "events" ("migrated_from_source") `)
    await queryRunner.query(`CREATE INDEX "idx_migrated_from_version_events" ON "events" ("migrated_from_version") `)
    await queryRunner.query(`CREATE INDEX "idx_migrated_from_id_events" ON "events" ("migrated_from_id") `)
    await queryRunner.query(
      `CREATE INDEX "idx_migrated_from_source_telemetry" ON "telemetry" ("migrated_from_source") `
    )
    await queryRunner.query(
      `CREATE INDEX "idx_migrated_from_version_telemetry" ON "telemetry" ("migrated_from_version") `
    )
    await queryRunner.query(`CREATE INDEX "idx_migrated_from_id_telemetry" ON "telemetry" ("migrated_from_id") `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_migrated_from_id_telemetry"`)
    await queryRunner.query(`DROP INDEX "idx_migrated_from_version_telemetry"`)
    await queryRunner.query(`DROP INDEX "idx_migrated_from_source_telemetry"`)
    await queryRunner.query(`DROP INDEX "idx_migrated_from_id_events"`)
    await queryRunner.query(`DROP INDEX "idx_migrated_from_version_events"`)
    await queryRunner.query(`DROP INDEX "idx_migrated_from_source_events"`)
    await queryRunner.query(`DROP INDEX "idx_migrated_from_id_devices"`)
    await queryRunner.query(`DROP INDEX "idx_migrated_from_version_devices"`)
    await queryRunner.query(`DROP INDEX "idx_migrated_from_source_devices"`)
    await queryRunner.query(`ALTER TABLE "telemetry" DROP COLUMN "migrated_from_id"`)
    await queryRunner.query(`ALTER TABLE "telemetry" DROP COLUMN "migrated_from_version"`)
    await queryRunner.query(`ALTER TABLE "telemetry" DROP COLUMN "migrated_from_source"`)
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "migrated_from_id"`)
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "migrated_from_version"`)
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "migrated_from_source"`)
    await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN "migrated_from_id"`)
    await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN "migrated_from_version"`)
    await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN "migrated_from_source"`)
  }
}
