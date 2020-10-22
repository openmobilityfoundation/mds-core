import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreatePolicyMetadataTable1603045629619 implements MigrationInterface {
  name = 'CreatePolicyMetadataTable1603045629619'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [policy_metadata] = await queryRunner.query(
      `SELECT "table_name" FROM information_schema.tables WHERE "table_catalog" = CURRENT_CATALOG AND "table_schema" = CURRENT_SCHEMA AND "table_name" = 'policy_metadata'`
    )
    if (policy_metadata === undefined) {
      await queryRunner.query(
        `CREATE TABLE "policy_metadata" ("id" bigint GENERATED ALWAYS AS IDENTITY, "policy_id" uuid NOT NULL, "policy_metadata" json, CONSTRAINT "policy_metadata_pkey" PRIMARY KEY ("policy_id"))`
      )
      await queryRunner.query(`CREATE UNIQUE INDEX "idx_id_policy_metadata" ON "policy_metadata" ("id") `)
      await queryRunner.query(
        `ALTER TABLE "policy_metadata" ADD CONSTRAINT "fk_policies_policy_id" FOREIGN KEY ("policy_id") REFERENCES "policies"("policy_id") ON DELETE CASCADE ON UPDATE NO ACTION`
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "policy_metadata" DROP CONSTRAINT "fk_policies_policy_id"`)
    await queryRunner.query(`DROP INDEX "idx_id_policy_metadata"`)
    await queryRunner.query(`DROP TABLE "policy_metadata"`)
  }
}
