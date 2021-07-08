import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEventAnnotationEntity1624574823000 implements MigrationInterface {
  name = 'AddEventAnnotationEntity1624574823000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "event_annotations" ("recorded" bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint, "id" bigint GENERATED ALWAYS AS IDENTITY, "device_id" uuid NOT NULL, "timestamp" bigint NOT NULL, "vehicle_id" character varying(255) NOT NULL, "vehicle_type" character varying(31) NOT NULL, "propulsion_types" character varying(31) array NOT NULL, "geography_ids" uuid array NOT NULL, "geography_types" character varying(255) array NOT NULL, "latency_ms" bigint NOT NULL, CONSTRAINT "event_annotations_pkey" PRIMARY KEY ("device_id", "timestamp"))`
    )
    await queryRunner.query(`CREATE INDEX "idx_recorded_event_annotations" ON "event_annotations" ("recorded") `)
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_id_event_annotations" ON "event_annotations" ("id") `)
    await queryRunner.query(`CREATE INDEX "idx_vehicle_id_event_annotations" ON "event_annotations" ("vehicle_id") `)
    await queryRunner.query(
      `CREATE INDEX "idx_vehicle_type_event_annotations" ON "event_annotations" ("vehicle_type") `
    )
    await queryRunner.query(
      `CREATE INDEX "idx_propulsion_types_event_annotations" ON "event_annotations" ("propulsion_types") `
    )
    await queryRunner.query(
      `CREATE INDEX "idx_geography_ids_event_annotations" ON "event_annotations" ("geography_ids") `
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_geography_ids_event_annotations"`)
    await queryRunner.query(`DROP INDEX "idx_propulsion_types_event_annotations"`)
    await queryRunner.query(`DROP INDEX "idx_vehicle_type_event_annotations"`)
    await queryRunner.query(`DROP INDEX "idx_vehicle_id_event_annotations"`)
    await queryRunner.query(`DROP INDEX "idx_id_event_annotations"`)
    await queryRunner.query(`DROP INDEX "idx_recorded_event_annotations"`)
    await queryRunner.query(`DROP TABLE "event_annotations"`)
  }
}
