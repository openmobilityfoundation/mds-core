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

export class CreateAuditEventsTable1603226483200 implements MigrationInterface {
  name = 'CreateAuditEventsTable1603226483200'

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('audit_events'))) {
      await queryRunner.query(
        `CREATE TABLE "audit_events" ("recorded" bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint, "id" bigint GENERATED ALWAYS AS IDENTITY, "audit_trip_id" uuid NOT NULL, "timestamp" bigint NOT NULL, "audit_event_id" uuid NOT NULL, "audit_event_type" character varying(31) NOT NULL, "audit_issue_code" character varying(31), "audit_subject_id" character varying(255) NOT NULL, "note" character varying(255), "lat" double precision NOT NULL, "lng" double precision NOT NULL, "speed" real, "heading" real, "accuracy" real, "altitude" real, "charge" real, CONSTRAINT "audit_events_pkey" PRIMARY KEY ("audit_trip_id", "timestamp"))`
      )
      await queryRunner.query(`CREATE INDEX "idx_recorded_audit_events" ON "audit_events" ("recorded") `)
      await queryRunner.query(`CREATE UNIQUE INDEX "idx_id_audit_events" ON "audit_events" ("id") `)
    } else {
      await queryRunner.query(
        `ALTER TABLE "audit_events" ALTER COLUMN "recorded" SET DEFAULT (extract(epoch from now()) * 1000)::bigint`
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_id_audit_events"`)
    await queryRunner.query(`DROP INDEX "idx_recorded_audit_events"`)
    await queryRunner.query(`DROP TABLE "audit_events"`)
  }
}
