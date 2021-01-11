import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAttachmentListIdColumn1610046028054 implements MigrationInterface {
  name = 'AddAttachmentListIdColumn1610046028054'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "attachments" ADD "attachment_list_id" uuid`)
    await queryRunner.query(
      `CREATE INDEX "idx_attachment_list_id_attachments" ON "attachments" ("attachment_list_id") `
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_attachment_list_id_attachments"`)
    await queryRunner.query(`ALTER TABLE "attachments" DROP COLUMN "attachment_list_id"`)
  }
}
