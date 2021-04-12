import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddModalityColumn1616682680014 implements MigrationInterface {
  name = 'AddModalityColumn1616682680014'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "devices" ADD COLUMN "modality" varchar(255)`)
    await queryRunner.query(`UPDATE "devices" SET "modality" = 'micro_mobility'`)
    await queryRunner.query(`ALTER TABLE "devices" ALTER COLUMN "modality" SET NOT NULL`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN "modality"`)
  }
}
