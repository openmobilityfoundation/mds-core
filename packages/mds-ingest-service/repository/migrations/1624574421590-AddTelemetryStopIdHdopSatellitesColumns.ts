import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTelemetryStopIdHdopSatellitesColumns1624574421590 implements MigrationInterface {
  name = 'AddTelemetryStopIdHdopSatellitesColumns1624574421590'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "telemetry" ADD "hdop" real`)
    await queryRunner.query(`ALTER TABLE "telemetry" ADD "satellites" real`)
    await queryRunner.query(`ALTER TABLE "telemetry" ADD "stop_id" uuid`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "telemetry" DROP COLUMN "stop_id"`)
    await queryRunner.query(`ALTER TABLE "telemetry" DROP COLUMN "satellites"`)
    await queryRunner.query(`ALTER TABLE "telemetry" DROP COLUMN "hdop"`)
  }
}
