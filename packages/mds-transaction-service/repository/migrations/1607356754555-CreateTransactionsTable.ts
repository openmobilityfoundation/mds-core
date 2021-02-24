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

export class CreateTransactionsTable1607356754555 implements MigrationInterface {
  name = 'CreateTransactionsTable1607356754555'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "transactions" ("recorded" bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint, "id" bigint GENERATED ALWAYS AS IDENTITY, "transaction_id" uuid NOT NULL, "provider_id" uuid NOT NULL, "device_id" uuid, "timestamp" bigint NOT NULL, "fee_type" character varying(127) NOT NULL, "amount" integer NOT NULL, "receipt" jsonb NOT NULL, CONSTRAINT "transactions_pkey" PRIMARY KEY ("transaction_id"))`
    )
    await queryRunner.query(`CREATE INDEX "idx_recorded_transactions" ON "transactions" ("recorded") `)
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_id_transactions" ON "transactions" ("id") `)
    await queryRunner.query(
      `CREATE TABLE "transaction_operations" ("recorded" bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint, "id" bigint GENERATED ALWAYS AS IDENTITY, "transaction_id" uuid NOT NULL, "operation_id" uuid NOT NULL, "timestamp" bigint NOT NULL, "operation_type" character varying(127) NOT NULL, "author" character varying(127) NOT NULL, CONSTRAINT "transaction_operations_pkey" PRIMARY KEY ("transaction_id", "operation_id"))`
    )
    await queryRunner.query(
      `CREATE INDEX "idx_recorded_transaction_operations" ON "transaction_operations" ("recorded") `
    )
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_id_transaction_operations" ON "transaction_operations" ("id") `)
    await queryRunner.query(
      `CREATE TABLE "transaction_statuses" ("recorded" bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint, "id" bigint GENERATED ALWAYS AS IDENTITY, "transaction_id" uuid NOT NULL, "status_id" uuid NOT NULL, "timestamp" bigint NOT NULL, "status_type" character varying(127) NOT NULL, "author" character varying(127) NOT NULL, CONSTRAINT "transaction_statuses_pkey" PRIMARY KEY ("transaction_id", "status_id"))`
    )
    await queryRunner.query(`CREATE INDEX "idx_recorded_transaction_statuses" ON "transaction_statuses" ("recorded") `)
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_id_transaction_statuses" ON "transaction_statuses" ("id") `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_id_transaction_statuses"`)
    await queryRunner.query(`DROP INDEX "idx_recorded_transaction_statuses"`)
    await queryRunner.query(`DROP TABLE "transaction_statuses"`)
    await queryRunner.query(`DROP INDEX "idx_id_transaction_operations"`)
    await queryRunner.query(`DROP INDEX "idx_recorded_transaction_operations"`)
    await queryRunner.query(`DROP TABLE "transaction_operations"`)
    await queryRunner.query(`DROP INDEX "idx_id_transactions"`)
    await queryRunner.query(`DROP INDEX "idx_recorded_transactions"`)
    await queryRunner.query(`DROP TABLE "transactions"`)
  }
}
