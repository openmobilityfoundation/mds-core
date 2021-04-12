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

export class CreateComplianceSnapshotsTable1590524762011 implements MigrationInterface {
  name = 'CreateComplianceSnapshotsTable1590524762011'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "compliance_snapshots" ("recorded" bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint, "id" bigint GENERATED ALWAYS AS IDENTITY, "compliance_as_of" bigint NOT NULL, "compliance_snapshot_id" uuid NOT NULL, "policy_name" character varying (255) NOT NULL, "policy_id" uuid NOT NULL,"provider_id" uuid NOT NULL, "vehicles_found" jsonb NOT NULL, "excess_vehicles_count" integer NOT NULL, "total_violations" integer NOT NULL, CONSTRAINT "compliance_snapshots_pkey" PRIMARY KEY ("compliance_snapshot_id"))`
    )
    await queryRunner.query(`CREATE INDEX "idx_recorded_compliance_snapshots" ON "compliance_snapshots" ("recorded") `)
    await queryRunner.query(
      `CREATE INDEX "idx_compliance_as_of_compliance_snapshots" ON "compliance_snapshots" ("compliance_as_of") `
    )
    await queryRunner.query(
      `CREATE INDEX "idx_provider_id_compliance_snapshots" ON "compliance_snapshots" ("provider_id") `
    )
    await queryRunner.query(
      `CREATE INDEX "idx_policy_id_compliance_snapshots" ON "compliance_snapshots" ("policy_id") `
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_recorded_compliance_snapshots"`)
    await queryRunner.query(`DROP INDEX "idx_compliance_as_of_compliance_snapshots"`)
    await queryRunner.query(`DROP INDEX "idx_provider_id_compliance_snapshots"`)
    await queryRunner.query(`DROP INDEX "idx_policy_id_compliance_snapshots"`)
    await queryRunner.query(`DROP TABLE "compliance_snapshots"`)
  }
}
