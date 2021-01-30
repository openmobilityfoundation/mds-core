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

export class CreatePolicyMetadataTable1603045629619 implements MigrationInterface {
  name = 'CreatePolicyMetadataTable1603045629619'

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('policy_metadata'))) {
      await queryRunner.query(
        `CREATE TABLE "policy_metadata" ("id" bigint GENERATED ALWAYS AS IDENTITY, "policy_id" uuid NOT NULL, "policy_metadata" json, CONSTRAINT "policy_metadata_pkey" PRIMARY KEY ("policy_id"))`
      )
      await queryRunner.query(`CREATE UNIQUE INDEX "idx_id_policy_metadata" ON "policy_metadata" ("id") `)
      await queryRunner.query(
        `ALTER TABLE "policy_metadata" ADD CONSTRAINT "fk_policies_policy_id" FOREIGN KEY ("policy_id") REFERENCES "policies"("policy_id") ON DELETE CASCADE ON UPDATE NO ACTION`
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "policy_metadata" DROP CONSTRAINT "fk_policies_policy_id"`)
    await queryRunner.query(`DROP INDEX "idx_id_policy_metadata"`)
    await queryRunner.query(`DROP TABLE "policy_metadata"`)
  }
}
