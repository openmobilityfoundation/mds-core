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

export class CreateGeographyMetadataTable1602790946354 implements MigrationInterface {
  name = 'CreateGeographyMetadataTable1602790946354'

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('geography_metadata'))) {
      await queryRunner.query(
        `CREATE TABLE "geography_metadata" ("id" bigint GENERATED ALWAYS AS IDENTITY, "geography_id" uuid NOT NULL, "geography_metadata" json, CONSTRAINT "geography_metadata_pkey" PRIMARY KEY ("geography_id"))`
      )
      await queryRunner.query(`CREATE UNIQUE INDEX "idx_id_geography_metadata" ON "geography_metadata" ("id") `)
      await queryRunner.query(
        `ALTER TABLE "geography_metadata" ADD CONSTRAINT "fk_geographies_geography_id" FOREIGN KEY ("geography_id") REFERENCES "geographies"("geography_id") ON DELETE CASCADE ON UPDATE NO ACTION`
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "geography_metadata" DROP CONSTRAINT "fk_geographies_geography_id"`)
    await queryRunner.query(`DROP INDEX "idx_id_geography_metadata"`)
    await queryRunner.query(`DROP TABLE "geography_metadata"`)
  }
}
