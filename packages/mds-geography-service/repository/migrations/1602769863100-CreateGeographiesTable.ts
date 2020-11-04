import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateGeographiesTable1602769863100 implements MigrationInterface {
  name = 'CreateGeographiesTable1602769863100'

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('geographies'))) {
      await queryRunner.query(
        `CREATE TABLE "geographies" ("id" bigint GENERATED ALWAYS AS IDENTITY, "geography_id" uuid NOT NULL, "name" character varying(255), "description" character varying(255), "effective_date" bigint, "publish_date" bigint, "prev_geographies" uuid array, "geography_json" json NOT NULL, CONSTRAINT "geographies_pkey" PRIMARY KEY ("geography_id"))`
      )
      await queryRunner.query(`CREATE UNIQUE INDEX "idx_id_geographies" ON "geographies" ("id") `)
    } else {
      // Legacy migration code created an index that doesn't follow the standard naming convention
      await queryRunner.query(`DROP INDEX IF EXISTS geographies_publish_date_idx`)
    }
    await queryRunner.query(`CREATE INDEX "idx_publish_date_geographies" ON "geographies" ("publish_date") `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_publish_date_geographies"`)
    await queryRunner.query(`DROP INDEX "idx_id_geographies"`)
    await queryRunner.query(`DROP TABLE "geographies"`)
  }
}
