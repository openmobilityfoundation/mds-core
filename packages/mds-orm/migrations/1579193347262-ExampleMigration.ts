import { MigrationInterface, QueryRunner } from 'typeorm'

// This is an empty migration used to demonstrate how migrations are exported
export class ExampleMigration1579193347262 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // The method executed by migration:run
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This method executed by migration:revert
  }
}
