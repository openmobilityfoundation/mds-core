import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateMetricsTable1588016731204 implements MigrationInterface {
  name = 'CreateMetricsTable1588016731204'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "metrics" ("recorded" bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint, "id" bigint GENERATED ALWAYS AS IDENTITY, "name" character varying(255) NOT NULL, "time_bin_size" bigint NOT NULL, "time_bin_start" bigint NOT NULL, "provider_id" uuid, "geography_id" uuid, "vehicle_type" character varying(31), "count" bigint, "sum" double precision, "min" double precision, "max" double precision, "avg" double precision, CONSTRAINT "metrics_pkey" PRIMARY KEY ("name", "time_bin_size", "time_bin_start", "id"))`,
      undefined
    )
    await queryRunner.query(`CREATE INDEX "idx_recorded_metrics" ON "metrics" ("recorded") `, undefined)
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_id_metrics" ON "metrics" ("id") `, undefined)
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_dimensions_metrics" ON "metrics" ("name", "time_bin_size", "time_bin_start", "provider_id", "vehicle_type", "geography_id") `,
      undefined
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_dimensions_metrics"`, undefined)
    await queryRunner.query(`DROP INDEX "idx_id_metrics"`, undefined)
    await queryRunner.query(`DROP INDEX "idx_recorded_metrics"`, undefined)
    await queryRunner.query(`DROP TABLE "metrics"`, undefined)
  }
}
