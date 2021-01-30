/**
 * Copyright 2019 City of Los Angeles
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

export class CreateJurisdictionsTable1582294819607 implements MigrationInterface {
  name = 'CreateJurisdictionsTable1582294819607'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "jurisdictions" ("recorded" bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint, "id" bigint GENERATED ALWAYS AS IDENTITY, "jurisdiction_id" uuid NOT NULL, "agency_key" character varying(63) NOT NULL, "versions" json NOT NULL, CONSTRAINT "jurisdictions_pkey" PRIMARY KEY ("jurisdiction_id"))`,
      undefined
    )
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_id_jurisdictions" ON "jurisdictions" ("id") `, undefined)
    await queryRunner.query(`CREATE INDEX "idx_recorded_jurisdictions" ON "jurisdictions" ("recorded") `, undefined)
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_agency_key_jurisdictions" ON "jurisdictions" ("agency_key") `,
      undefined
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_agency_key_jurisdictions"`, undefined)
    await queryRunner.query(`DROP INDEX "idx_recorded_jurisdictions"`, undefined)
    await queryRunner.query(`DROP INDEX "idx_id_jurisdictions"`, undefined)
    await queryRunner.query(`DROP TABLE "jurisdictions"`, undefined)
  }
}
