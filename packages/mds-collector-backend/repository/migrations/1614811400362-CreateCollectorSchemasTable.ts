/**
 * Copyright 2021 City of Los Angeles
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

export class CreateCollectorSchemasTable1614811400362 implements MigrationInterface {
  name = 'CreateCollectorSchemasTable1614811400362'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "collector-schemas" ("recorded" bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint, "id" bigint GENERATED ALWAYS AS IDENTITY, "schema_id" character varying(255) NOT NULL, "schema" json NOT NULL, CONSTRAINT "collector_schemas_pkey" PRIMARY KEY ("schema_id"))`
    )
    await queryRunner.query(`CREATE INDEX "idx_recorded_collector_schemas" ON "collector-schemas" ("recorded") `)
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_id_collector_schemas" ON "collector-schemas" ("id") `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_id_collector_schemas"`)
    await queryRunner.query(`DROP INDEX "idx_recorded_collector_schemas"`)
    await queryRunner.query(`DROP TABLE "collector-schemas"`)
  }
}
