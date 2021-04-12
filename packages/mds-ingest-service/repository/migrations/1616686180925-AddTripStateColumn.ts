import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTripStateColumn1616686180925 implements MigrationInterface {
  name = 'AddTripStateColumn1616686180925'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "events" ADD "trip_state" character varying(31)`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "trip_state"`)
  }
}
