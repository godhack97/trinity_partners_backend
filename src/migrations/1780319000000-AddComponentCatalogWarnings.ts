import { MigrationInterface, QueryRunner } from "typeorm";

const PREMIUM_SUPPORT_ID = "7c940001-2d4a-4d51-9000-000000000005";
const PREMIUM_WARNING =
  "Стоимость премиум-поддержки рассчитывается отдельно ответственным менеджером.";
const PREMIUM_WARNING_COLOR = "#D97706";

export class AddComponentCatalogWarnings1780319000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cnf_component_catalog_profiles
        ADD COLUMN warning_text text DEFAULT NULL AFTER disabled_reason,
        ADD COLUMN warning_color varchar(20) DEFAULT NULL AFTER warning_text
    `);
    await queryRunner.query(
      `
        UPDATE cnf_component_catalog_profiles
        SET warning_text = ?, warning_color = ?
        WHERE component_id = ?
      `,
      [PREMIUM_WARNING, PREMIUM_WARNING_COLOR, PREMIUM_SUPPORT_ID],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cnf_component_catalog_profiles
        DROP COLUMN warning_color,
        DROP COLUMN warning_text
    `);
  }
}
