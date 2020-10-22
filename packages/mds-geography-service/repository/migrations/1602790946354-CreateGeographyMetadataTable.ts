import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateGeographyMetadataTable1602790946354 implements MigrationInterface {
  name = 'CreateGeographyMetadataTable1602790946354'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [geography_metadata] = await queryRunner.query(
      `SELECT "table_name" FROM information_schema.tables WHERE "table_catalog" = CURRENT_CATALOG AND "table_schema" = CURRENT_SCHEMA AND "table_name" = 'geography_metadata'`
    )
    if (geography_metadata === undefined) {
      await queryRunner.query(
        `CREATE TABLE "geography_metadata" ("id" bigint GENERATED ALWAYS AS IDENTITY, "geography_id" uuid NOT NULL, "geography_metadata" json, CONSTRAINT "geography_metadata_pkey" PRIMARY KEY ("geography_id"))`
      )
      await queryRunner.query(`CREATE UNIQUE INDEX "idx_id_geography_metadata" ON "geography_metadata" ("id") `)
      await queryRunner.query(
        `ALTER TABLE "geography_metadata" ADD CONSTRAINT "fk_geographies_geography_id" FOREIGN KEY ("geography_id") REFERENCES "geographies"("geography_id") ON DELETE CASCADE ON UPDATE NO ACTION`
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "geography_metadata" DROP CONSTRAINT "fk_geographies_geography_id"`)
    await queryRunner.query(`DROP INDEX "idx_id_geography_metadata"`)
    await queryRunner.query(`DROP TABLE "geography_metadata"`)
  }
}
