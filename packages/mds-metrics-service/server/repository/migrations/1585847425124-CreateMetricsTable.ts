/*
    Copyright 2019-2020 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateMetricsTable1585847425124 implements MigrationInterface {
  name = 'CreateMetricsTable1585847425124'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "metrics" ("id" bigint GENERATED ALWAYS AS IDENTITY, "recorded" bigint NOT NULL, "name" character varying(255) NOT NULL, "time_bin_size" bigint NOT NULL, "time_bin_start" bigint NOT NULL, "provider_id" uuid NOT NULL, "geography_id" uuid, "vehicle_type" character varying(31) NOT NULL, "count" bigint NOT NULL, "sum" double precision NOT NULL, "min" double precision NOT NULL, "max" double precision NOT NULL, "avg" double precision NOT NULL, CONSTRAINT "metrics_pkey" PRIMARY KEY ("name", "time_bin_size", "time_bin_start", "provider_id", "geography_id", "vehicle_type"))`,
      undefined
    )
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_id_metrics" ON "metrics" ("id") `, undefined)
    await queryRunner.query(`CREATE INDEX "idx_recorded_metrics" ON "metrics" ("recorded") `, undefined)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_recorded_metrics"`, undefined)
    await queryRunner.query(`DROP INDEX "idx_id_metrics"`, undefined)
    await queryRunner.query(`DROP TABLE "metrics"`, undefined)
  }
}
