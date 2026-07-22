import { MigrationInterface, QueryRunner } from "typeorm";

const LEGACY_REJECT_REASON =
  "Заявка была отклонена до перехода на новую модель модерации";

export class AddCompanyManagementFoundation1780316200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns: Array<[string, string]> = [
      ["contact_email", "varchar(255) NULL"],
      ["contact_phone", "varchar(64) NULL"],
      ["responsible_manager_id", "int unsigned NULL"],
      ["approved_by_user_id", "int unsigned NULL"],
      ["approved_at", "timestamp NULL"],
      ["review_locked_at", "timestamp NULL"],
      ["review_locked_by_user_id", "int unsigned NULL"],
      ["review_lock_reason", "text NULL"],
      ["suspended_at", "timestamp NULL"],
      ["suspended_by_user_id", "int unsigned NULL"],
      ["suspension_reason", "text NULL"],
    ];
    for (const [name, definition] of columns) {
      if (!(await queryRunner.hasColumn("companies", name))) {
        await queryRunner.query(
          `ALTER TABLE companies ADD COLUMN ${name} ${definition}`,
        );
      }
    }

    // A previous interrupted MariaDB ALTER can leave signed columns committed.
    // Normalize the FK columns to the exact unsigned type used by users.id.
    await queryRunner.query(`
      ALTER TABLE companies
        MODIFY COLUMN responsible_manager_id int unsigned NULL,
        MODIFY COLUMN approved_by_user_id int unsigned NULL,
        MODIFY COLUMN review_locked_by_user_id int unsigned NULL,
        MODIFY COLUMN suspended_by_user_id int unsigned NULL
    `);

    const companiesTable = await queryRunner.getTable("companies");
    const foreignKeys = new Set(
      (companiesTable?.foreignKeys || []).map(({ name }) => name),
    );
    const companyForeignKeys = [
      ["FK_companies_responsible_manager", "responsible_manager_id"],
      ["FK_companies_approved_by", "approved_by_user_id"],
      ["FK_companies_review_locked_by", "review_locked_by_user_id"],
      ["FK_companies_suspended_by", "suspended_by_user_id"],
    ];
    for (const [constraint, column] of companyForeignKeys) {
      if (!foreignKeys.has(constraint)) {
        await queryRunner.query(`
          ALTER TABLE companies
          ADD CONSTRAINT ${constraint}
            FOREIGN KEY (${column}) REFERENCES users(id) ON DELETE SET NULL
        `);
      }
    }

    const indices = new Set(
      (companiesTable?.indices || []).map(({ name }) => name),
    );
    const companyIndices = [
      ["IDX_companies_status_manager", "status, responsible_manager_id"],
      ["IDX_companies_partnership_type", "partnership_type"],
      ["IDX_companies_name", "name"],
      ["IDX_companies_inn", "inn"],
    ];
    for (const [name, expression] of companyIndices) {
      if (!indices.has(name)) {
        await queryRunner.query(
          `CREATE INDEX ${name} ON companies (${expression})`,
        );
      }
    }

    if (!(await queryRunner.hasTable("company_status_history"))) {
      await queryRunner.query(`
        CREATE TABLE company_status_history (
        id int NOT NULL AUTO_INCREMENT,
        company_id int unsigned NOT NULL,
        action varchar(64) NOT NULL,
        from_status varchar(32) NULL,
        to_status varchar(32) NULL,
        actor_user_id int unsigned NULL,
        responsible_manager_id int unsigned NULL,
        reason text NULL,
        details json NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX IDX_company_status_history_company_created (company_id, created_at),
        INDEX IDX_company_status_history_actor (actor_user_id),
        CONSTRAINT FK_company_status_history_company
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        CONSTRAINT FK_company_status_history_actor
          FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT FK_company_status_history_manager
          FOREIGN KEY (responsible_manager_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB
      `);
    }

    await queryRunner.query(`
      UPDATE companies company
      INNER JOIN users owner ON owner.id = company.owner_id
      LEFT JOIN users_info owner_info ON owner_info.user_id = owner.id
      LEFT JOIN users owner_manager ON owner_manager.id = owner.manager_id
      LEFT JOIN roles owner_manager_primary_role
        ON owner_manager_primary_role.id = owner_manager.role_id
        AND owner_manager_primary_role.deleted_at IS NULL
      LEFT JOIN users validation_manager
        ON validation_manager.id = company.validated_by_manager_id
      LEFT JOIN roles validation_manager_primary_role
        ON validation_manager_primary_role.id = validation_manager.role_id
        AND validation_manager_primary_role.deleted_at IS NULL
      SET
        company.contact_email = COALESCE(company.contact_email, owner.email),
        company.contact_phone = COALESCE(company.contact_phone, owner_info.phone),
        company.responsible_manager_id =
          COALESCE(
            company.responsible_manager_id,
            CASE
              WHEN owner_manager.is_activated = 1
                AND owner_manager.deleted_at IS NULL
                AND (
                  owner_manager_primary_role.name = 'partner_manager'
                  OR EXISTS (
                    SELECT 1
                    FROM user_roles owner_manager_user_role
                    INNER JOIN roles owner_manager_secondary_role
                      ON owner_manager_secondary_role.id = owner_manager_user_role.role_id
                      AND owner_manager_secondary_role.deleted_at IS NULL
                    WHERE owner_manager_user_role.user_id = owner_manager.id
                      AND owner_manager_secondary_role.name = 'partner_manager'
                  )
                )
                THEN owner_manager.id
              WHEN validation_manager.is_activated = 1
                AND validation_manager.deleted_at IS NULL
                AND (
                  validation_manager_primary_role.name = 'partner_manager'
                  OR EXISTS (
                    SELECT 1
                    FROM user_roles validation_manager_user_role
                    INNER JOIN roles validation_manager_secondary_role
                      ON validation_manager_secondary_role.id = validation_manager_user_role.role_id
                      AND validation_manager_secondary_role.deleted_at IS NULL
                    WHERE validation_manager_user_role.user_id = validation_manager.id
                      AND validation_manager_secondary_role.name = 'partner_manager'
                  )
                )
                THEN validation_manager.id
              ELSE NULL
            END
          ),
        company.approved_by_user_id = company.validated_by_manager_id,
        company.approved_at = company.validated_at
    `);

    await queryRunner.query(
      `
        INSERT INTO company_status_history (
          company_id,
          action,
          from_status,
          to_status,
          reason,
          created_at,
          updated_at
        )
        SELECT
          id,
          'legacy_rejected_migrated',
          'reject',
          'pending',
          ?,
          CURRENT_TIMESTAMP(6),
          CURRENT_TIMESTAMP(6)
        FROM companies
        WHERE status = 'reject'
      `,
      [LEGACY_REJECT_REASON],
    );

    await queryRunner.query(
      `
        UPDATE companies
        SET
          status = 'pending',
          review_locked_at = COALESCE(updated_at, CURRENT_TIMESTAMP),
          review_lock_reason = ?
        WHERE status = 'reject'
      `,
      [LEGACY_REJECT_REASON],
    );

    await queryRunner.query(`
      ALTER TABLE companies
      MODIFY COLUMN status enum('pending', 'accept', 'suspended')
        NOT NULL DEFAULT 'pending'
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO user_roles (user_id, role_id)
      SELECT DISTINCT ce.employee_id, staff_role.id
      FROM company_employees ce
      INNER JOIN users employee_user ON employee_user.id = ce.employee_id
      INNER JOIN roles staff_role ON staff_role.name = 'staff'
      LEFT JOIN roles primary_role ON primary_role.id = employee_user.role_id
      LEFT JOIN user_roles technical_user_role
        ON technical_user_role.user_id = ce.employee_id
      LEFT JOIN roles secondary_role
        ON secondary_role.id = technical_user_role.role_id
      WHERE secondary_role.name = 'technical_specialist'
        AND (primary_role.name IS NULL
          OR primary_role.name <> 'technical_specialist')
    `);

    await queryRunner.query(`
      UPDATE users employee_user
      INNER JOIN company_employees ce ON ce.employee_id = employee_user.id
      INNER JOIN roles technical_role
        ON technical_role.id = employee_user.role_id
        AND technical_role.name = 'technical_specialist'
      INNER JOIN roles staff_role ON staff_role.name = 'staff'
      SET employee_user.role_id = staff_role.id
    `);

    await queryRunner.query(`
      DELETE technical_user_role
      FROM user_roles technical_user_role
      INNER JOIN company_employees ce
        ON ce.employee_id = technical_user_role.user_id
      INNER JOIN roles technical_role
        ON technical_role.id = technical_user_role.role_id
        AND technical_role.name = 'technical_specialist'
    `);

    await queryRunner.query(`
      DELETE role_permission
      FROM role_permissions role_permission
      INNER JOIN roles technical_role
        ON technical_role.id = role_permission.role_id
        AND technical_role.name = 'technical_specialist'
      INNER JOIN permissions permission
        ON permission.id = role_permission.permission_id
      WHERE permission.name IN (
        'api.companies.write',
        'api.deals.write',
        'api.deals.remove'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE companies
      MODIFY COLUMN status enum('pending', 'accept', 'reject', 'suspended')
        NOT NULL DEFAULT 'pending'
    `);

    await queryRunner.query("DROP TABLE company_status_history");
    await queryRunner.query("DROP INDEX IDX_companies_inn ON companies");
    await queryRunner.query("DROP INDEX IDX_companies_name ON companies");
    await queryRunner.query(
      "DROP INDEX IDX_companies_partnership_type ON companies",
    );
    await queryRunner.query(
      "DROP INDEX IDX_companies_status_manager ON companies",
    );

    await queryRunner.query(`
      ALTER TABLE companies
        DROP FOREIGN KEY FK_companies_suspended_by,
        DROP FOREIGN KEY FK_companies_review_locked_by,
        DROP FOREIGN KEY FK_companies_approved_by,
        DROP FOREIGN KEY FK_companies_responsible_manager
    `);

    await queryRunner.query(`
      ALTER TABLE companies
        DROP COLUMN suspension_reason,
        DROP COLUMN suspended_by_user_id,
        DROP COLUMN suspended_at,
        DROP COLUMN review_lock_reason,
        DROP COLUMN review_locked_by_user_id,
        DROP COLUMN review_locked_at,
        DROP COLUMN approved_at,
        DROP COLUMN approved_by_user_id,
        DROP COLUMN responsible_manager_id,
        DROP COLUMN contact_phone,
        DROP COLUMN contact_email
    `);
  }
}
