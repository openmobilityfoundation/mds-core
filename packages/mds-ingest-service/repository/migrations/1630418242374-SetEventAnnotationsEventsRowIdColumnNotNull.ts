import { MigrationInterface, QueryRunner } from 'typeorm'

export class SetEventAnnotationsEventsRowIdColumnNotNull1630418242374 implements MigrationInterface {
  name = 'SetEventAnnotationsEventsRowIdColumnNotNull1630418242374'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "event_annotations" ALTER COLUMN "events_row_id" SET NOT NULL`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "event_annotations" ALTER COLUMN "events_row_id" DROP NOT NULL`)
  }
}
