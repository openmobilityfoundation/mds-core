import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEventsVehicleStateIdIndex1627315357677 implements MigrationInterface {
  name = 'AddEventsVehicleStateIdIndex1627315357677'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_vehicle_state_id_events" on events(vehicle_state, id)`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_vehicle_state_id_events`)
  }
}
