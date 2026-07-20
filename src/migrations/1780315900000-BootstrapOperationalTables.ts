import { MigrationInterface, QueryRunner } from "typeorm";

export class BootstrapOperationalTables1780315900000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cnf_component_backups (
        id varchar(36) NOT NULL DEFAULT (UUID()),
        name varchar(255) NOT NULL,
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        created_by varchar(36) DEFAULT NULL,
        components_count int DEFAULT NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cnf_component_backup_data (
        backup_id varchar(36) DEFAULT NULL,
        component_data json DEFAULT NULL,
        KEY backup_id (backup_id),
        CONSTRAINT cnf_component_backup_data_backup_fk
          FOREIGN KEY (backup_id) REFERENCES cnf_component_backups(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS deal_deletion_requests (
        id int unsigned NOT NULL AUTO_INCREMENT,
        deal_id int NOT NULL,
        requester_id int unsigned NOT NULL,
        deletion_reason text NOT NULL,
        status enum('pending','approved','rejected') DEFAULT 'pending',
        processed_by_id int unsigned DEFAULT NULL,
        processed_at timestamp NULL DEFAULT NULL,
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_deal_id (deal_id),
        KEY idx_requester_id (requester_id),
        KEY idx_processed_by_id (processed_by_id),
        CONSTRAINT deal_deletion_requests_deal_fk
          FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
        CONSTRAINT deal_deletion_requests_requester_fk
          FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT deal_deletion_requests_processor_fk
          FOREIGN KEY (processed_by_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS download_centr (
        id int NOT NULL AUTO_INCREMENT,
        name varchar(255) NOT NULL,
        description text DEFAULT NULL,
        tags varchar(500) DEFAULT NULL,
        file_path varchar(500) NOT NULL,
        uploaded_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_tags (tags),
        KEY idx_uploaded_at (uploaded_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forbidden_inns (
        id int NOT NULL AUTO_INCREMENT,
        inn varchar(12) NOT NULL,
        reason varchar(255) DEFAULT NULL,
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY unique_forbidden_inn (inn)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_actions (
        id int NOT NULL AUTO_INCREMENT,
        user_id int DEFAULT NULL,
        action varchar(64) NOT NULL,
        details json DEFAULT NULL,
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    if (!(await queryRunner.hasColumn("customers", "bitrix24_company_id"))) {
      await queryRunner.query(`
        ALTER TABLE customers
        ADD COLUMN bitrix24_company_id int unsigned NULL COMMENT 'ID компании в Bitrix24',
        ADD UNIQUE KEY unique_customers_bitrix24_company_id (bitrix24_company_id)
      `);
    }

    if (!(await queryRunner.hasColumn("customers", "company_id"))) {
      await queryRunner.query(`
        ALTER TABLE customers
        ADD COLUMN company_id int unsigned NULL,
        ADD KEY customers_company_idx (company_id),
        ADD CONSTRAINT customers_company_fk
          FOREIGN KEY (company_id) REFERENCES companies(id)
      `);
    }

    if (!(await queryRunner.hasColumn("deals", "bitrix24_deal_id"))) {
      await queryRunner.query(`
        ALTER TABLE deals
        ADD COLUMN bitrix24_deal_id int unsigned NULL COMMENT 'ID сделки в Bitrix24',
        ADD KEY deals_bitrix24_deal_idx (bitrix24_deal_id)
      `);
    }

    if (!(await queryRunner.hasColumn("deals", "bitrix24_sync_status"))) {
      await queryRunner.query(`
        ALTER TABLE deals
        ADD COLUMN bitrix24_sync_status enum('pending','synced','failed')
          DEFAULT 'pending' COMMENT 'Статус синхронизации с Bitrix24',
        ADD KEY deals_bitrix24_sync_status_idx (bitrix24_sync_status)
      `);
    }

    if (!(await queryRunner.hasColumn("deals", "bitrix24_synced_at"))) {
      await queryRunner.query(`
        ALTER TABLE deals
        ADD COLUMN bitrix24_synced_at timestamp NULL
          COMMENT 'Время последней синхронизации с Bitrix24'
      `);
    }

    if (!(await queryRunner.hasColumn("deals", "deleted_at"))) {
      await queryRunner.query(`
        ALTER TABLE deals
        ADD COLUMN deleted_at timestamp NULL
      `);
    }
  }

  // This migration captures tables/columns already present on deployed
  // databases. Destructive rollback would remove operational and audit data.
  public async down(): Promise<void> {}
}
