import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreatePoliciesTable1603045382246 implements MigrationInterface {
  name = 'CreatePoliciesTable1603045382246'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [policies] = await queryRunner.query(
      `SELECT "table_name" FROM information_schema.tables WHERE "table_catalog" = CURRENT_CATALOG AND "table_schema" = CURRENT_SCHEMA AND "table_name" = 'policies'`
    )
    if (policies === undefined) {
      await queryRunner.query(
        `CREATE TABLE "policies" ("id" bigint GENERATED ALWAYS AS IDENTITY, "policy_id" uuid NOT NULL, "policy_json" json NOT NULL, CONSTRAINT "policies_pkey" PRIMARY KEY ("policy_id"))`
      )
      await queryRunner.query(`CREATE UNIQUE INDEX "idx_id_policies" ON "policies" ("id") `)
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_id_policies"`)
    await queryRunner.query(`DROP TABLE "policies"`)
  }
}
