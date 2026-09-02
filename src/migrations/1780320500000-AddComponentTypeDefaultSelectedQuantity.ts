import { MigrationInterface, QueryRunner } from "typeorm";

const TWO_BY_DEFAULT_COMPONENT_TYPE_IDS = [
  "cpu-type-id",
  "ram-type-id",
  "psu-type-id",
];

export class AddComponentTypeDefaultSelectedQuantity1780320500000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cnf_component_types
        ADD COLUMN default_selected_quantity int NOT NULL DEFAULT 1
        AFTER move_selected_to_top
    `);
    await queryRunner.query(
      `
        UPDATE cnf_component_types
        SET default_selected_quantity = 2
        WHERE id IN (?, ?, ?)
      `,
      TWO_BY_DEFAULT_COMPONENT_TYPE_IDS,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cnf_component_types
        DROP COLUMN default_selected_quantity
    `);
  }
}
