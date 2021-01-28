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

export class CreateDevicesTable1603212409274 implements MigrationInterface {
  name = 'CreateDevicesTable1603212409274'

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('devices'))) {
      await queryRunner.query(
        `CREATE TABLE "devices" ("recorded" bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint, "id" bigint GENERATED ALWAYS AS IDENTITY, "device_id" uuid NOT NULL, "provider_id" uuid NOT NULL, "vehicle_id" character varying(255) NOT NULL, "type" character varying(31) NOT NULL, "propulsion" character varying(31) array NOT NULL, "year" smallint, "mfgr" character varying(127), "model" character varying(127), CONSTRAINT "devices_pkey" PRIMARY KEY ("device_id"))`
      )
      await queryRunner.query(`CREATE INDEX "idx_recorded_devices" ON "devices" ("recorded") `)
      await queryRunner.query(`CREATE UNIQUE INDEX "idx_id_devices" ON "devices" ("id") `)
    } else {
      await queryRunner.query(
        `ALTER TABLE "devices" ALTER COLUMN "recorded" SET DEFAULT (extract(epoch from now()) * 1000)::bigint`
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_id_devices"`)
    await queryRunner.query(`DROP INDEX "idx_recorded_devices"`)
    await queryRunner.query(`DROP TABLE "devices"`)
  }
}
