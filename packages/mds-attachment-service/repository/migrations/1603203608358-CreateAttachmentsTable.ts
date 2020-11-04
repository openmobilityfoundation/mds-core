import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAttachmentsTable1603203608358 implements MigrationInterface {
  name = 'CreateAttachmentsTable1603203608358'

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('attachments'))) {
      await queryRunner.query(
        `CREATE TABLE "attachments" ("recorded" bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint, "id" bigint GENERATED ALWAYS AS IDENTITY, "attachment_id" uuid NOT NULL, "attachment_filename" character varying(64) NOT NULL, "base_url" character varying(127) NOT NULL, "mimetype" character varying(255) NOT NULL, "thumbnail_filename" character varying(64), "thumbnail_mimetype" character varying(64), CONSTRAINT "attachments_pkey" PRIMARY KEY ("attachment_id"))`
      )
      await queryRunner.query(`CREATE INDEX "idx_recorded_attachments" ON "attachments" ("recorded") `)
      await queryRunner.query(`CREATE UNIQUE INDEX "idx_id_attachments" ON "attachments" ("id") `)
    } else {
      await queryRunner.query(
        `ALTER TABLE "attachments" ALTER COLUMN "recorded" SET DEFAULT (extract(epoch from now()) * 1000)::bigint`
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_id_attachments"`)
    await queryRunner.query(`DROP INDEX "idx_recorded_attachments"`)
    await queryRunner.query(`DROP TABLE "attachments"`)
  }
}
