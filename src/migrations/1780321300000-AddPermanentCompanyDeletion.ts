import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from "typeorm";

type CompanyReference = {
  table: string;
  column: string;
  identityConstraint: string;
  originalConstraint?: string;
  originalDelete?: "CASCADE" | "RESTRICT" | "SET NULL" | "NO ACTION";
  wasSigned?: boolean;
};

const HISTORICAL_REFERENCES: CompanyReference[] = [
  {
    table: "company_employees",
    column: "company_id",
    identityConstraint: "FK_company_employees_company_identity",
    wasSigned: true,
  },
  {
    table: "company_notification_outbox",
    column: "company_id",
    identityConstraint: "FK_company_outbox_company_identity",
    originalConstraint: "FK_company_notification_outbox_company",
    originalDelete: "CASCADE",
  },
  {
    table: "company_status_history",
    column: "company_id",
    identityConstraint: "FK_company_history_company_identity",
    originalConstraint: "FK_company_status_history_company",
    originalDelete: "CASCADE",
  },
  {
    table: "customers",
    column: "company_id",
    identityConstraint: "FK_customers_company_identity",
    originalConstraint: "fk_customers_company",
    originalDelete: "RESTRICT",
  },
  {
    table: "deals",
    column: "creator_company_id",
    identityConstraint: "FK_deals_creator_company_identity",
    originalConstraint: "FK_deals_creator_company",
    originalDelete: "RESTRICT",
  },
  {
    table: "deals",
    column: "distributor_company_id",
    identityConstraint: "FK_deals_distributor_company_identity",
    originalConstraint: "FK_deals_distributor_company",
    originalDelete: "SET NULL",
  },
  {
    table: "deals",
    column: "integrator_company_id",
    identityConstraint: "FK_deals_integrator_company_identity",
    wasSigned: true,
  },
];

export class AddPermanentCompanyDeletion1780321300000
  implements MigrationInterface
{
  name = "AddPermanentCompanyDeletion1780321300000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("company_identities"))) {
      await queryRunner.createTable(
        new Table({
          name: "company_identities",
          columns: [
            { name: "id", type: "int", unsigned: true, isPrimary: true },
            { name: "name", type: "varchar", length: "255" },
            { name: "inn", type: "varchar", length: "255" },
            { name: "partnership_type", type: "varchar", length: "32" },
            { name: "owner_user_id", type: "int", unsigned: true, isNullable: true },
            { name: "profile_snapshot", type: "json", isNullable: true },
            { name: "company_created_at", type: "timestamp", isNullable: true },
            { name: "permanently_deleted_at", type: "timestamp", isNullable: true },
            { name: "deleted_by_user_id", type: "int", unsigned: true, isNullable: true },
            { name: "deleted_by_email", type: "varchar", length: "255", isNullable: true },
          ],
        }),
      );
    }

    await queryRunner.query(`
      INSERT INTO company_identities (
        id, name, inn, partnership_type, owner_user_id,
        profile_snapshot, company_created_at
      )
      SELECT
        company.id,
        company.name,
        company.inn,
        company.partnership_type,
        company.owner_id,
        JSON_OBJECT(
          'status', company.status,
          'contact_email', company.contact_email,
          'contact_phone', company.contact_phone,
          'site_url', company.site_url,
          'company_business_line', company.company_business_line,
          'partner_level', company.partner_level,
          'certificate_expiry', company.certificate_expiry,
          'responsible_manager_id', company.responsible_manager_id,
          'approved_at', company.approved_at
        ),
        company.created_at
      FROM companies company
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        inn = VALUES(inn),
        partnership_type = VALUES(partnership_type),
        owner_user_id = VALUES(owner_user_id),
        profile_snapshot = VALUES(profile_snapshot),
        company_created_at = VALUES(company_created_at)
    `);

    // Some old membership rows legitimately outlived their company before
    // company identities existed. Keep those numeric links auditable instead
    // of deleting or nulling them merely to satisfy the new foreign keys.
    await queryRunner.query(`
      INSERT IGNORE INTO company_identities (
        id, name, inn, partnership_type, profile_snapshot
      )
      SELECT
        legacy_company.id,
        CONCAT('Историческая компания #', legacy_company.id),
        '',
        'integrator',
        JSON_OBJECT('legacy_orphan', TRUE)
      FROM (
        SELECT company_id id FROM company_employees WHERE company_id IS NOT NULL
        UNION
        SELECT company_id id FROM company_notification_outbox WHERE company_id IS NOT NULL
        UNION
        SELECT company_id id FROM company_status_history WHERE company_id IS NOT NULL
        UNION
        SELECT company_id id FROM customers WHERE company_id IS NOT NULL
        UNION
        SELECT creator_company_id id FROM deals WHERE creator_company_id IS NOT NULL
        UNION
        SELECT distributor_company_id id FROM deals WHERE distributor_company_id IS NOT NULL
        UNION
        SELECT integrator_company_id id FROM deals WHERE integrator_company_id IS NOT NULL
      ) legacy_company
    `);

    for (const reference of HISTORICAL_REFERENCES) {
      await this.replaceCompanyReferenceWithIdentity(queryRunner, reference);
    }

    await queryRunner.query("DROP TRIGGER IF EXISTS trg_companies_identity_after_insert");
    await queryRunner.query("DROP TRIGGER IF EXISTS trg_companies_identity_after_update");
    await queryRunner.query(`
      CREATE TRIGGER trg_companies_identity_after_insert
      AFTER INSERT ON companies
      FOR EACH ROW
      INSERT INTO company_identities (
        id, name, inn, partnership_type, owner_user_id,
        profile_snapshot, company_created_at
      ) VALUES (
        NEW.id, NEW.name, NEW.inn, NEW.partnership_type, NEW.owner_id,
        JSON_OBJECT(
          'status', NEW.status,
          'contact_email', NEW.contact_email,
          'contact_phone', NEW.contact_phone,
          'site_url', NEW.site_url,
          'company_business_line', NEW.company_business_line,
          'partner_level', NEW.partner_level,
          'certificate_expiry', NEW.certificate_expiry,
          'responsible_manager_id', NEW.responsible_manager_id,
          'approved_at', NEW.approved_at
        ),
        NEW.created_at
      )
      ON DUPLICATE KEY UPDATE
        name = NEW.name,
        inn = NEW.inn,
        partnership_type = NEW.partnership_type,
        owner_user_id = NEW.owner_id,
        profile_snapshot = VALUES(profile_snapshot),
        company_created_at = NEW.created_at
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_companies_identity_after_update
      AFTER UPDATE ON companies
      FOR EACH ROW
      UPDATE company_identities
      SET name = NEW.name,
          inn = NEW.inn,
          partnership_type = NEW.partnership_type,
          owner_user_id = NEW.owner_id,
          profile_snapshot = JSON_OBJECT(
            'status', NEW.status,
            'contact_email', NEW.contact_email,
            'contact_phone', NEW.contact_phone,
            'site_url', NEW.site_url,
            'company_business_line', NEW.company_business_line,
            'partner_level', NEW.partner_level,
            'certificate_expiry', NEW.certificate_expiry,
            'responsible_manager_id', NEW.responsible_manager_id,
            'approved_at', NEW.approved_at
          ),
          company_created_at = NEW.created_at
      WHERE id = NEW.id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const permanentlyDeleted = await queryRunner.query(
      "SELECT COUNT(*) AS count FROM company_identities WHERE permanently_deleted_at IS NOT NULL",
    );
    if (Number(permanentlyDeleted[0]?.count || 0) > 0) {
      throw new Error(
        "Нельзя откатить миграцию: существуют исторические записи физически удалённых компаний",
      );
    }

    await queryRunner.query("DROP TRIGGER IF EXISTS trg_companies_identity_after_insert");
    await queryRunner.query("DROP TRIGGER IF EXISTS trg_companies_identity_after_update");

    for (const reference of HISTORICAL_REFERENCES) {
      const table = await queryRunner.getTable(reference.table);
      const identityForeignKey = table?.foreignKeys.find(
        (foreignKey) => foreignKey.name === reference.identityConstraint,
      );
      if (identityForeignKey) {
        await queryRunner.dropForeignKey(reference.table, identityForeignKey);
      }
      if (reference.originalConstraint) {
        await queryRunner.createForeignKey(
          reference.table,
          new TableForeignKey({
            name: reference.originalConstraint,
            columnNames: [reference.column],
            referencedTableName: "companies",
            referencedColumnNames: ["id"],
            onDelete: reference.originalDelete,
          }),
        );
      }
      if (reference.wasSigned) {
        await queryRunner.query(
          `ALTER TABLE \`${reference.table}\` MODIFY COLUMN \`${reference.column}\` int NULL`,
        );
      }
    }

    await queryRunner.dropTable("company_identities");
  }

  private async replaceCompanyReferenceWithIdentity(
    queryRunner: QueryRunner,
    reference: CompanyReference,
  ) {
    if (!(await queryRunner.hasTable(reference.table))) return;
    let table = await queryRunner.getTable(reference.table);
    const column = table?.findColumnByName(reference.column);
    if (!column) return;

    const currentForeignKey = table.foreignKeys.find(
      (foreignKey) =>
        foreignKey.columnNames.length === 1 &&
        foreignKey.columnNames[0] === reference.column,
    );
    if (currentForeignKey) {
      await queryRunner.dropForeignKey(reference.table, currentForeignKey);
    }

    if (reference.wasSigned) {
      await queryRunner.query(
        `ALTER TABLE \`${reference.table}\` MODIFY COLUMN \`${reference.column}\` int unsigned NULL`,
      );
      table = await queryRunner.getTable(reference.table);
    }

    await queryRunner.createForeignKey(
      reference.table,
      new TableForeignKey({
        name: reference.identityConstraint,
        columnNames: [reference.column],
        referencedTableName: "company_identities",
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
    );
  }
}
