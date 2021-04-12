import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAccessibilityOptionsColumn1616681612878 implements MigrationInterface {
  name = 'AddAccessibilityOptionsColumn1616681612878'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "devices" ADD "accessibility_options" character varying(255) array`)
    await queryRunner.query(`UPDATE "devices" SET "accessibility_options" = '{}'`)
    await queryRunner.query(`ALTER TABLE "devices" ALTER COLUMN "accessibility_options" SET NOT NULL`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN "accessibility_options"`)
  }
}
