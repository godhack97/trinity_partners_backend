import { MigrationInterface, QueryRunner } from "typeorm";

const CPU_COMPONENT_TYPE_ID = "cpu-type-id";

export class AddComponentTypeSelectedOrdering1780320100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cnf_component_types
        ADD COLUMN move_selected_to_top tinyint(1) NOT NULL DEFAULT 1 AFTER name
    `);
    await queryRunner.query(
      `
        UPDATE cnf_component_types
        SET move_selected_to_top = 0
        WHERE id = ?
      `,
      [CPU_COMPONENT_TYPE_ID],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cnf_component_types
        DROP COLUMN move_selected_to_top
    `);
  }
}
