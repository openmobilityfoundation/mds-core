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
