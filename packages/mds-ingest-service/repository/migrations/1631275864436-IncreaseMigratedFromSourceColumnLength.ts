import { MigrationInterface, QueryRunner } from 'typeorm'

export class IncreaseMigratedFromSourceColumnLength1631275864436 implements MigrationInterface {
  name = 'IncreaseMigratedFromSourceColumnLength1631275864436'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "devices" ALTER COLUMN "migrated_from_source" TYPE character varying(127)`)
    await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "migrated_from_source" TYPE character varying(127)`)
    await queryRunner.query(`ALTER TABLE "telemetry" ALTER COLUMN "migrated_from_source" TYPE character varying(127)`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "telemetry" ALTER COLUMN "migrated_from_source" TYPE character varying(31)`)
    await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "migrated_from_source" TYPE character varying(31)`)
    await queryRunner.query(`ALTER TABLE "devices" ALTER COLUMN "migrated_from_source" TYPE character varying(31)`)
  }
}
