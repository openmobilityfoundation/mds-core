import { MigrationInterface, QueryRunner } from 'typeorm'

export class DropServiceAreaIdColumn1627680668538 implements MigrationInterface {
  name = 'DropServiceAreaIdColumn1627680668538'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "service_area_id"`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "events" ADD "service_area_id" uuid`)
  }
}
