/**
 * Copyright 2020 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
