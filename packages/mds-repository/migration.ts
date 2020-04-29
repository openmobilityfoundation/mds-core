/*
    Copyright 2019-2020 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import { MigrationInterface, QueryRunner } from 'typeorm'

export const CreateRepositoryMigration = (migrationTableName: string) => {
  return class CreateRepository0000000000001 implements MigrationInterface {
    name = 'CreateRepository0000000000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(
        `CREATE UNIQUE INDEX "idx_migration_table_name" ON "${migrationTableName}" ("name") `,
        undefined
      )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP INDEX "idx_migration_table_name"`, undefined)
    }
  }
}
