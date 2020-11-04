import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAuditsTable1603220489874 implements MigrationInterface {
  name = 'CreateAuditsTable1603220489874'

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('audits'))) {
      await queryRunner.query(
        `CREATE TABLE "audits" ("recorded" bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint, "id" bigint GENERATED ALWAYS AS IDENTITY, "audit_trip_id" uuid NOT NULL, "audit_device_id" uuid NOT NULL, "audit_subject_id" character varying(255) NOT NULL, "provider_id" uuid NOT NULL, "provider_name" character varying(127) NOT NULL, "provider_vehicle_id" character varying(255) NOT NULL, "provider_device_id" uuid, "timestamp" bigint NOT NULL, "deleted" bigint, CONSTRAINT "audits_pkey" PRIMARY KEY ("audit_trip_id"))`
      )
      await queryRunner.query(`CREATE INDEX "idx_recorded_audits" ON "audits" ("recorded") `)
      await queryRunner.query(`CREATE UNIQUE INDEX "idx_id_audits" ON "audits" ("id") `)
    } else {
      await queryRunner.query(
        `ALTER TABLE "audits" ALTER COLUMN "recorded" SET DEFAULT (extract(epoch from now()) * 1000)::bigint`
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_id_audits"`)
    await queryRunner.query(`DROP INDEX "idx_recorded_audits"`)
    await queryRunner.query(`DROP TABLE "audits"`)
  }
}
