import { MigrationInterface, QueryRunner } from 'typeorm'

export class TransactionsSearchIndicies1615586339528 implements MigrationInterface {
  name = 'TransactionsSearchIndicies1615586339528'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX "idx_fee_type_transactions" ON "transactions" ("fee_type") `)
    await queryRunner.query(`CREATE INDEX "idx_amount_transactions" ON "transactions" ("amount") `)
    await queryRunner.query(
      `CREATE INDEX "idx_receipt_transactions" ON "transactions" USING GIN (jsonb_to_tsvector('simple', receipt,'["string","numeric","boolean"]'))`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_receipt_transactions"`)
    await queryRunner.query(`DROP INDEX "idx_amount_transactions"`)
    await queryRunner.query(`DROP INDEX "idx_fee_type_transactions"`)
  }
}
