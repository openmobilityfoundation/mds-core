import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSupersededByColumnToPoliciesTable1629221239968 implements MigrationInterface {
  name = 'AddSupersededByColumnToPoliciesTable1629221239968'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "policies" ADD "superseded_by" uuid array`)
    await queryRunner.query(`UPDATE policies SET superseded_by=t.superseded_by
    FROM (
      SELECT
        array_agg(policy_id) "superseded_by",
        json_array_elements_text(policy_json -> 'prev_policies') AS "superseded_policies"
      FROM
        policies
      WHERE (policy_json -> 'prev_policies')::text <> 'null'
      AND (policy_json ->> 'publish_date' IS NOT NULL)
    GROUP BY
      superseded_policies) AS t
    WHERE
      t.superseded_policies::uuid = policies.policy_id`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "policies" DROP COLUMN "superseded_by"`)
  }
}
