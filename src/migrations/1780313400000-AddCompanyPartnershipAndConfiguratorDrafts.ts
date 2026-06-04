import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanyPartnershipAndConfiguratorDrafts1780313400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasPartnershipType = await queryRunner.hasColumn(
      "companies",
      "partnership_type",
    );

    if (!hasPartnershipType) {
      await queryRunner.query(`
        ALTER TABLE companies
        ADD COLUMN partnership_type enum('integrator', 'distributor') NOT NULL DEFAULT 'integrator' AFTER main_customers
      `);
    }

    const hasDraftsTable = await queryRunner.hasTable("configurator_drafts");

    if (!hasDraftsTable) {
      await queryRunner.query(`
        CREATE TABLE configurator_drafts (
          id int(10) unsigned NOT NULL AUTO_INCREMENT,
          created_at timestamp NULL DEFAULT current_timestamp(),
          updated_at timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          creator_id int(10) unsigned NOT NULL,
          title varchar(255) NOT NULL,
          server_id varchar(36) DEFAULT NULL,
          serverbox_height_id varchar(36) DEFAULT NULL,
          components json DEFAULT NULL,
          total_price decimal(12,2) NOT NULL DEFAULT 0.00,
          description text DEFAULT NULL,
          deleted_at timestamp NULL DEFAULT NULL,
          PRIMARY KEY (id),
          KEY IDX_configurator_drafts_creator_id (creator_id),
          CONSTRAINT FK_configurator_drafts_creator_id
            FOREIGN KEY (creator_id) REFERENCES users(id)
            ON DELETE CASCADE ON UPDATE NO ACTION
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasDraftsTable = await queryRunner.hasTable("configurator_drafts");

    if (hasDraftsTable) {
      await queryRunner.query(`DROP TABLE configurator_drafts`);
    }

    const hasPartnershipType = await queryRunner.hasColumn(
      "companies",
      "partnership_type",
    );

    if (hasPartnershipType) {
      await queryRunner.query(`
        ALTER TABLE companies
        DROP COLUMN partnership_type
      `);
    }
  }
}
