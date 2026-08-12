import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDistributorCompanyImportPlans1780317800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("distributor_company_import_plans")) return;

    await queryRunner.query(`
      CREATE TABLE distributor_company_import_plans (
        id int unsigned NOT NULL AUTO_INCREMENT,
        legacy_distributor_id int unsigned NOT NULL,
        legacy_name varchar(255) NOT NULL,
        legal_company_name varchar(255) NOT NULL,
        inn varchar(12) NOT NULL,
        owner_first_name varchar(100) NOT NULL,
        owner_last_name varchar(100) NOT NULL,
        owner_email varchar(255) NOT NULL,
        owner_phone varchar(32) NOT NULL,
        responsible_manager_user_id int unsigned NOT NULL,
        requested_existing_company_id int unsigned NULL,
        resolved_owner_user_id int unsigned NULL,
        resolved_company_id int unsigned NULL,
        status enum(
          'awaiting_owner_registration',
          'awaiting_company_provisioning',
          'ready_for_backfill',
          'reconciled'
        ) NOT NULL,
        mapping_fingerprint char(64) NOT NULL,
        source_file_sha256 char(64) NOT NULL,
        last_validated_at datetime(6) NOT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UQ_distributor_company_import_legacy (legacy_distributor_id),
        KEY IDX_distributor_company_import_status (status),
        KEY IDX_distributor_company_import_inn (inn),
        KEY IDX_distributor_company_import_owner_email (owner_email),
        KEY IDX_distributor_company_import_resolved_company (resolved_company_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("distributor_company_import_plans")) {
      await queryRunner.query("DROP TABLE distributor_company_import_plans");
    }
  }
}
