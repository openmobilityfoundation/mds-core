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

export class CreateEventsTable1603212540962 implements MigrationInterface {
  name = 'CreateEventsTable1603212540962'

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('events'))) {
      await queryRunner.query(
        `CREATE TABLE "events" ("recorded" bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint, "id" bigint GENERATED ALWAYS AS IDENTITY, "device_id" uuid NOT NULL, "provider_id" uuid NOT NULL, "timestamp" bigint NOT NULL, "event_types" character varying(31) array NOT NULL, "vehicle_state" character varying(31) NOT NULL, "telemetry_timestamp" bigint, "trip_id" uuid, "service_area_id" uuid, CONSTRAINT "events_pkey" PRIMARY KEY ("device_id", "timestamp"))`
      )
      await queryRunner.query(`CREATE INDEX "idx_recorded_events" ON "events" ("recorded") `)
      await queryRunner.query(`CREATE INDEX "idx_trip_id_timestamp_events" ON "events" ("trip_id", "timestamp") `)
      await queryRunner.query(`CREATE UNIQUE INDEX "idx_id_events" ON "events" ("id") `)
    } else {
      await queryRunner.query(
        `ALTER TABLE "events" ALTER COLUMN "recorded" SET DEFAULT (extract(epoch from now()) * 1000)::bigint`
      )
      await queryRunner.query(
        `CREATE INDEX CONCURRENTLY "idx_trip_id_timestamp_events" ON "events" ("trip_id", "timestamp") `
      )
      await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "event_type" SET NOT NULL`)
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_id_events"`)
    await queryRunner.query(`DROP INDEX "idx_recorded_events"`)
    await queryRunner.query(`DROP TABLE "events"`)
  }
}
