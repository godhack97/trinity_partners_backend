import { MigrationInterface, QueryRunner, Table } from "typeorm";
import { normalizeLegacyRussianInn } from "../utils/russian-inn";

const CUSTOMER_INN_INDEX = "IDX_customers_inn_normalized";
const LEGACY_BITRIX_COMPANY_UNIQUE_INDEX =
  "unique_customers_bitrix24_company_id";
const CUSTOMER_BITRIX_COMPANY_INDEX = "IDX_customers_bitrix24_company_id";

const RESPONSIBLE_MANAGER_INDEX = "IDX_deals_responsible_manager_id";
const MANAGER_DUPLICATE_REVIEW_INDEX =
  "IDX_deals_manager_duplicate_review";
const RESPONSIBLE_MANAGER_FK = "FK_deals_responsible_manager";
const DUPLICATE_REVIEWER_INDEX =
  "IDX_deals_duplicate_reviewed_by_user_id";
const DUPLICATE_REVIEWER_FK = "FK_deals_duplicate_reviewed_by_user";
const DUPLICATE_DEAL_INDEX = "IDX_deals_duplicate_of_deal_id";
const DUPLICATE_DEAL_FK = "FK_deals_duplicate_of_deal";

const REGISTRY_TABLE = "deal_customer_inn_registry";

const indexColumnsMatch = (
  actual: readonly string[] | undefined,
  expected: readonly string[],
): boolean =>
  actual?.length === expected.length &&
  expected.every((columnName, index) => actual[index] === columnName);

const hasIndex = (
  table: Table | undefined,
  name: string,
  columns: string | readonly string[],
): boolean =>
  Boolean(table?.indices.some((index) => {
    const expectedColumns =
      typeof columns === "string" ? [columns] : columns;
    return (
      index.name === name ||
      indexColumnsMatch(index.columnNames, expectedColumns)
    );
  }));

const hasForeignKey = (
  table: Table | undefined,
  name: string,
  columnName: string,
  referencedTableName: string,
): boolean =>
  Boolean(
    table?.foreignKeys.some(
      (foreignKey) =>
        foreignKey.name === name ||
        (foreignKey.columnNames?.length === 1 &&
          foreignKey.columnNames[0] === columnName &&
          foreignKey.referencedTableName === referencedTableName),
    ),
  );

const findIndexName = (
  table: Table | undefined,
  name: string,
  columns: string | readonly string[],
): string | undefined =>
  table?.indices.find((index) => {
    const expectedColumns =
      typeof columns === "string" ? [columns] : columns;
    return (
      index.name === name ||
      indexColumnsMatch(index.columnNames, expectedColumns)
    );
  })?.name;

const findForeignKeyName = (
  table: Table | undefined,
  name: string,
  columnName: string,
  referencedTableName: string,
): string | undefined =>
  table?.foreignKeys.find(
    (foreignKey) =>
      foreignKey.name === name ||
      (foreignKey.columnNames?.length === 1 &&
        foreignKey.columnNames[0] === columnName &&
        foreignKey.referencedTableName === referencedTableName),
  )?.name;

export class AddDealDuplicateWorkflowFoundation1780317500000
  implements MigrationInterface
{
  private async backfillResponsibleManagers(
    queryRunner: QueryRunner,
  ): Promise<void> {
    // An internally created deal belongs to its creator. Both primary and
    // secondary roles are supported during the role-model transition.
    await queryRunner.query(`
      UPDATE deals deal
      INNER JOIN users creator ON creator.id = deal.creator_id
      LEFT JOIN roles primary_role ON primary_role.id = creator.role_id
      SET deal.responsible_manager_id = creator.id
      WHERE deal.responsible_manager_id IS NULL
        AND (
          (primary_role.name IN ('partner_manager', 'super_admin')
            AND primary_role.deleted_at IS NULL)
          OR EXISTS (
            SELECT 1
            FROM user_roles creator_role
            INNER JOIN roles secondary_role
              ON secondary_role.id = creator_role.role_id
            WHERE creator_role.user_id = creator.id
              AND secondary_role.name IN ('partner_manager', 'super_admin')
              AND secondary_role.deleted_at IS NULL
          )
        )
    `);

    // Partner creators inherit the manager of their one unambiguous company.
    // Ownership and accepted membership are treated equally; creators linked
    // to several distinct companies remain NULL for an explicit manual choice.
    await queryRunner.query(`
      UPDATE deals deal
      INNER JOIN (
        SELECT candidate.creator_id, MIN(candidate.responsible_manager_id) manager_id
        FROM (
          SELECT
            company.owner_id creator_id,
            company.id company_id,
            company.responsible_manager_id
          FROM companies company
          WHERE company.deleted_at IS NULL

          UNION

          SELECT
            membership.employee_id creator_id,
            company.id company_id,
            company.responsible_manager_id
          FROM company_employees membership
          INNER JOIN companies company ON company.id = membership.company_id
          WHERE membership.status = 'accept'
            AND membership.deleted_at IS NULL
            AND company.deleted_at IS NULL
        ) candidate
        GROUP BY candidate.creator_id
        HAVING COUNT(DISTINCT candidate.company_id) = 1
          AND COUNT(DISTINCT candidate.responsible_manager_id) = 1
      ) resolved_manager ON resolved_manager.creator_id = deal.creator_id
      INNER JOIN users manager_user
        ON manager_user.id = resolved_manager.manager_id
        AND manager_user.is_activated = 1
        AND manager_user.deleted_at IS NULL
      LEFT JOIN roles manager_primary_role
        ON manager_primary_role.id = manager_user.role_id
        AND manager_primary_role.deleted_at IS NULL
      SET deal.responsible_manager_id = resolved_manager.manager_id
      WHERE deal.responsible_manager_id IS NULL
        AND (
          manager_primary_role.name = 'partner_manager'
          OR EXISTS (
            SELECT 1
            FROM user_roles manager_role_entry
            INNER JOIN roles manager_secondary_role
              ON manager_secondary_role.id = manager_role_entry.role_id
            WHERE manager_role_entry.user_id = manager_user.id
              AND manager_secondary_role.name = 'partner_manager'
              AND manager_secondary_role.deleted_at IS NULL
          )
        )
    `);
  }

  private async backfillDuplicateRegistry(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const submittedDeals = await queryRunner.query(`
      SELECT
        deal.id,
        deal.duplicate_review_status,
        customer.inn_normalized
      FROM deals deal
      INNER JOIN customers customer ON customer.id = deal.customer_id
      WHERE deal.deleted_at IS NULL
        AND deal.status != 'draft'
        AND customer.inn_normalized IS NOT NULL
      ORDER BY customer.inn_normalized, deal.created_at, deal.id
    `);
    if (!Array.isArray(submittedDeals)) return;

    const dealsByInn = new Map<
      string,
      Array<{ id: number; duplicateReviewStatus?: string | null }>
    >();
    for (const row of submittedDeals) {
      // Do not trust values manually written between partial migration runs.
      const normalizedInn = normalizeLegacyRussianInn(row?.inn_normalized);
      const id = Number(row?.id);
      if (!normalizedInn || !Number.isSafeInteger(id) || id <= 0) continue;

      const group = dealsByInn.get(normalizedInn) || [];
      group.push({
        id,
        duplicateReviewStatus: row?.duplicate_review_status,
      });
      dealsByInn.set(normalizedInn, group);
    }

    for (const [normalizedInn, deals] of dealsByInn) {
      const canonicalDealId = deals[0].id;
      await queryRunner.query(
        `
          INSERT INTO deal_customer_inn_registry (
            inn_normalized,
            canonical_deal_id,
            created_at,
            updated_at
          )
          VALUES (?, ?, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6))
          ON DUPLICATE KEY UPDATE
            canonical_deal_id = VALUES(canonical_deal_id),
            updated_at = CURRENT_TIMESTAMP(6)
        `,
        [normalizedInn, canonicalDealId],
      );

      // If old heuristic data marked the oldest deal as pending, turn it into
      // the canonical anchor. A final human decision is never changed here.
      await queryRunner.query(
        `
          UPDATE deals
          SET duplicate_of_deal_id = NULL,
              duplicate_review_status = NULL,
              duplicate_reviewed_by_user_id = NULL,
              duplicate_reviewed_at = NULL,
              duplicate_review_comment = NULL
          WHERE id = ?
            AND (
              duplicate_review_status IS NULL
              OR duplicate_review_status = 'pending'
            )
        `,
        [canonicalDealId],
      );

      for (const duplicateDeal of deals.slice(1)) {
        if (
          duplicateDeal.duplicateReviewStatus === "duplicate" ||
          duplicateDeal.duplicateReviewStatus === "not_duplicate"
        ) {
          continue;
        }
        await queryRunner.query(
          `
            UPDATE deals
            SET duplicate_of_deal_id = ?,
                duplicate_review_status = 'pending',
                duplicate_reviewed_by_user_id = NULL,
                duplicate_reviewed_at = NULL,
                duplicate_review_comment = NULL
            WHERE id = ?
              AND (
                duplicate_review_status IS NULL
                OR duplicate_review_status = 'pending'
              )
          `,
          [canonicalDealId, duplicateDeal.id],
        );
      }
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("customers", "inn_normalized"))) {
      await queryRunner.query(`
        ALTER TABLE customers
          ADD COLUMN inn_normalized varchar(12) NULL
      `);
    }

    const legacyCustomers = await queryRunner.query(`
      SELECT id, inn
      FROM customers
      WHERE inn_normalized IS NULL
    `);
    if (Array.isArray(legacyCustomers)) {
      for (const customer of legacyCustomers) {
        const normalizedInn = normalizeLegacyRussianInn(customer?.inn);
        if (!normalizedInn) continue;

        await queryRunner.query(
          `
            UPDATE customers
            SET inn_normalized = ?
            WHERE id = ? AND inn_normalized IS NULL
          `,
          [normalizedInn, customer.id],
        );
      }
    }

    let customersTable = await queryRunner.getTable("customers");
    if (
      !hasIndex(customersTable, CUSTOMER_INN_INDEX, "inn_normalized")
    ) {
      await queryRunner.query(`
        CREATE INDEX ${CUSTOMER_INN_INDEX}
          ON customers (inn_normalized)
      `);
    }

    customersTable = await queryRunner.getTable("customers");
    const uniqueBitrixCompanyIndex = customersTable?.indices.find(
      (index) =>
        index.isUnique &&
        indexColumnsMatch(index.columnNames, ["bitrix24_company_id"]),
    );
    if (uniqueBitrixCompanyIndex) {
      await queryRunner.query(
        `DROP INDEX ${uniqueBitrixCompanyIndex.name} ON customers`,
      );
    }
    customersTable = await queryRunner.getTable("customers");
    if (
      await queryRunner.hasColumn("customers", "bitrix24_company_id") &&
      !hasIndex(
        customersTable,
        CUSTOMER_BITRIX_COMPANY_INDEX,
        "bitrix24_company_id",
      )
    ) {
      await queryRunner.query(`
        CREATE INDEX ${CUSTOMER_BITRIX_COMPANY_INDEX}
          ON customers (bitrix24_company_id)
      `);
    }

    const dealColumns: ReadonlyArray<readonly [string, string]> = [
      ["responsible_manager_id", "int unsigned NULL"],
      ["duplicate_reviewed_by_user_id", "int unsigned NULL"],
      ["duplicate_reviewed_at", "datetime NULL"],
      ["duplicate_review_comment", "varchar(1000) NULL"],
    ];
    for (const [columnName, definition] of dealColumns) {
      if (!(await queryRunner.hasColumn("deals", columnName))) {
        await queryRunner.query(`
          ALTER TABLE deals
            ADD COLUMN ${columnName} ${definition}
        `);
      }
    }

    let dealsTable = await queryRunner.getTable("deals");
    const dealIndexes: ReadonlyArray<readonly [string, string]> = [
      [RESPONSIBLE_MANAGER_INDEX, "responsible_manager_id"],
      [DUPLICATE_REVIEWER_INDEX, "duplicate_reviewed_by_user_id"],
      [DUPLICATE_DEAL_INDEX, "duplicate_of_deal_id"],
    ];
    for (const [indexName, columnName] of dealIndexes) {
      if (!hasIndex(dealsTable, indexName, columnName)) {
        await queryRunner.query(`
          CREATE INDEX ${indexName}
            ON deals (${columnName})
        `);
      }
    }
    if (
      !hasIndex(dealsTable, MANAGER_DUPLICATE_REVIEW_INDEX, [
        "responsible_manager_id",
        "duplicate_review_status",
      ])
    ) {
      await queryRunner.query(`
        CREATE INDEX ${MANAGER_DUPLICATE_REVIEW_INDEX}
          ON deals (responsible_manager_id, duplicate_review_status)
      `);
    }

    dealsTable = await queryRunner.getTable("deals");
    if (
      !hasForeignKey(
        dealsTable,
        DUPLICATE_DEAL_FK,
        "duplicate_of_deal_id",
        "deals",
      )
    ) {
      // Old installations did not enforce the self-reference. Clear only
      // impossible references before adding the constraint.
      await queryRunner.query(`
        UPDATE deals child
        LEFT JOIN deals parent ON parent.id = child.duplicate_of_deal_id
        SET child.duplicate_of_deal_id = NULL
        WHERE child.duplicate_of_deal_id IS NOT NULL
          AND parent.id IS NULL
      `);
      await queryRunner.query(`
        ALTER TABLE deals
          ADD CONSTRAINT ${DUPLICATE_DEAL_FK}
          FOREIGN KEY (duplicate_of_deal_id)
          REFERENCES deals(id)
          ON DELETE SET NULL
      `);
    }

    if (
      !hasForeignKey(
        dealsTable,
        RESPONSIBLE_MANAGER_FK,
        "responsible_manager_id",
        "users",
      )
    ) {
      await queryRunner.query(`
        ALTER TABLE deals
          ADD CONSTRAINT ${RESPONSIBLE_MANAGER_FK}
          FOREIGN KEY (responsible_manager_id)
          REFERENCES users(id)
          ON DELETE SET NULL
      `);
    }

    if (
      !hasForeignKey(
        dealsTable,
        DUPLICATE_REVIEWER_FK,
        "duplicate_reviewed_by_user_id",
        "users",
      )
    ) {
      await queryRunner.query(`
        ALTER TABLE deals
          ADD CONSTRAINT ${DUPLICATE_REVIEWER_FK}
          FOREIGN KEY (duplicate_reviewed_by_user_id)
          REFERENCES users(id)
          ON DELETE SET NULL
      `);
    }

    await this.backfillResponsibleManagers(queryRunner);

    if (!(await queryRunner.hasTable(REGISTRY_TABLE))) {
      await queryRunner.query(`
        CREATE TABLE ${REGISTRY_TABLE} (
          inn_normalized varchar(12) NOT NULL,
          canonical_deal_id int NULL,
          created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
            ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (inn_normalized),
          INDEX IDX_deal_customer_inn_registry_canonical_deal
            (canonical_deal_id),
          CONSTRAINT FK_deal_customer_inn_registry_canonical_deal
            FOREIGN KEY (canonical_deal_id)
            REFERENCES deals(id)
            ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
      `);
    }

    await this.backfillDuplicateRegistry(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable(REGISTRY_TABLE)) {
      await queryRunner.query(`DROP TABLE ${REGISTRY_TABLE}`);
    }

    let dealsTable = await queryRunner.getTable("deals");
    const dealForeignKeys: ReadonlyArray<readonly [string, string, string]> = [
      [DUPLICATE_DEAL_FK, "duplicate_of_deal_id", "deals"],
      [
        DUPLICATE_REVIEWER_FK,
        "duplicate_reviewed_by_user_id",
        "users",
      ],
      [RESPONSIBLE_MANAGER_FK, "responsible_manager_id", "users"],
    ];
    for (const [
      expectedName,
      columnName,
      referencedTableName,
    ] of dealForeignKeys) {
      const foreignKeyName = findForeignKeyName(
        dealsTable,
        expectedName,
        columnName,
        referencedTableName,
      );
      if (foreignKeyName) {
        await queryRunner.query(
          `ALTER TABLE deals DROP FOREIGN KEY ${foreignKeyName}`,
        );
      }
    }

    dealsTable = await queryRunner.getTable("deals");
    const dealIndexes: ReadonlyArray<
      readonly [string, string | readonly string[]]
    > = [
      [DUPLICATE_DEAL_INDEX, "duplicate_of_deal_id"],
      [DUPLICATE_REVIEWER_INDEX, "duplicate_reviewed_by_user_id"],
      [
        MANAGER_DUPLICATE_REVIEW_INDEX,
        ["responsible_manager_id", "duplicate_review_status"],
      ],
      [RESPONSIBLE_MANAGER_INDEX, "responsible_manager_id"],
    ];
    for (const [expectedName, columnNames] of dealIndexes) {
      const indexName = findIndexName(dealsTable, expectedName, columnNames);
      if (indexName) {
        await queryRunner.query(`DROP INDEX ${indexName} ON deals`);
      }
    }

    dealsTable = await queryRunner.getTable("deals");
    for (const columnName of [
      "duplicate_review_comment",
      "duplicate_reviewed_at",
      "duplicate_reviewed_by_user_id",
      "responsible_manager_id",
    ]) {
      if (await queryRunner.hasColumn("deals", columnName)) {
        await queryRunner.query(
          `ALTER TABLE deals DROP COLUMN ${columnName}`,
        );
      }
    }

    let customersTable = await queryRunner.getTable("customers");
    const customerBitrixIndexName = customersTable?.indices.find(
      (index) =>
        !index.isUnique &&
        (index.name === CUSTOMER_BITRIX_COMPANY_INDEX ||
          indexColumnsMatch(index.columnNames, ["bitrix24_company_id"])),
    )?.name;
    if (customerBitrixIndexName) {
      await queryRunner.query(
        `DROP INDEX ${customerBitrixIndexName} ON customers`,
      );
    }

    customersTable = await queryRunner.getTable("customers");
    const hasLegacyBitrixCompanyUniqueIndex = customersTable?.indices.some(
      (index) =>
        index.isUnique &&
        indexColumnsMatch(index.columnNames, ["bitrix24_company_id"]),
    );
    if (
      (await queryRunner.hasColumn("customers", "bitrix24_company_id")) &&
      !hasLegacyBitrixCompanyUniqueIndex
    ) {
      // Phase 2 intentionally lets per-deal customer snapshots share one
      // Bitrix company. A rollback restores the old uniqueness contract by
      // retaining the mapping on the earliest snapshot and clearing it from
      // every later row before the UNIQUE index is recreated.
      await queryRunner.query(`
        UPDATE customers later_customer
        INNER JOIN customers earlier_customer
          ON earlier_customer.bitrix24_company_id =
            later_customer.bitrix24_company_id
          AND earlier_customer.id < later_customer.id
        SET later_customer.bitrix24_company_id = NULL
        WHERE later_customer.bitrix24_company_id IS NOT NULL
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX ${LEGACY_BITRIX_COMPANY_UNIQUE_INDEX}
          ON customers (bitrix24_company_id)
      `);
    }
    customersTable = await queryRunner.getTable("customers");
    const customerInnIndexName = findIndexName(
      customersTable,
      CUSTOMER_INN_INDEX,
      "inn_normalized",
    );
    if (customerInnIndexName) {
      await queryRunner.query(
        `DROP INDEX ${customerInnIndexName} ON customers`,
      );
    }
    if (await queryRunner.hasColumn("customers", "inn_normalized")) {
      await queryRunner.query(
        "ALTER TABLE customers DROP COLUMN inn_normalized",
      );
    }
  }
}
