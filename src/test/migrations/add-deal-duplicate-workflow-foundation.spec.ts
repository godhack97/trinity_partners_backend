import { AddDealDuplicateWorkflowFoundation1780317500000 } from "../../migrations/1780317500000-AddDealDuplicateWorkflowFoundation";

const compactSql = (statement: string): string =>
  statement.replace(/\s+/gu, " ").trim();

describe("AddDealDuplicateWorkflowFoundation1780317500000", () => {
  it("adds the duplicate workflow schema and backfills only valid legacy INNs", async () => {
    const query = jest.fn(async (statement: string, _parameters?: unknown[]) => {
      const normalizedStatement = compactSql(statement);
      if (normalizedStatement.startsWith("SELECT id, inn FROM customers")) {
        return [
          { id: 1, inn: " 7707-083-893 " },
          { id: 2, inn: "500100732259" },
          { id: 3, inn: "7707083894" },
          { id: 4, inn: "123456789" },
        ];
      }
      if (
        normalizedStatement.startsWith(
          "SELECT deal.id, deal.duplicate_review_status",
        )
      ) {
        return [
          {
            id: 10,
            inn_normalized: "7707083893",
            duplicate_review_status: null,
          },
          {
            id: 11,
            inn_normalized: "7707083893",
            duplicate_review_status: "pending",
          },
          {
            id: 12,
            inn_normalized: "7707083893",
            duplicate_review_status: "duplicate",
          },
          {
            id: 20,
            inn_normalized: "500100732259",
            duplicate_review_status: null,
          },
          {
            id: 30,
            inn_normalized: "invalid",
            duplicate_review_status: null,
          },
        ];
      }
      return undefined;
    });
    const queryRunner = {
      query,
      hasColumn: jest.fn(async (_table: string, column: string) =>
        column === "bitrix24_company_id",
      ),
      hasTable: jest.fn().mockResolvedValue(false),
      getTable: jest.fn().mockResolvedValue({ indices: [], foreignKeys: [] }),
    };

    await new AddDealDuplicateWorkflowFoundation1780317500000().up(
      queryRunner as any,
    );

    const sql = query.mock.calls
      .map(([statement]) => compactSql(statement))
      .join("\n");
    expect(sql).toContain("ADD COLUMN inn_normalized varchar(12) NULL");
    expect(sql).toContain(
      "CREATE INDEX IDX_customers_inn_normalized ON customers (inn_normalized)",
    );
    expect(sql).not.toContain("CREATE UNIQUE INDEX IDX_customers_inn_normalized");
    expect(sql).toContain(
      "CREATE INDEX IDX_customers_bitrix24_company_id ON customers (bitrix24_company_id)",
    );
    expect(sql).toContain("responsible_manager_id int unsigned NULL");
    expect(sql).toContain("duplicate_reviewed_by_user_id int unsigned NULL");
    expect(sql).toContain("duplicate_reviewed_at datetime NULL");
    expect(sql).toContain("duplicate_review_comment varchar(1000) NULL");
    expect(sql).toContain(
      "CREATE INDEX IDX_deals_manager_duplicate_review ON deals (responsible_manager_id, duplicate_review_status)",
    );
    expect(sql).toContain(
      "CONSTRAINT FK_deals_duplicate_of_deal FOREIGN KEY (duplicate_of_deal_id) REFERENCES deals(id) ON DELETE SET NULL",
    );
    expect(sql).toContain(
      "CONSTRAINT FK_deals_responsible_manager FOREIGN KEY (responsible_manager_id) REFERENCES users(id) ON DELETE SET NULL",
    );
    expect(sql).toContain("UPDATE deals child LEFT JOIN deals parent");
    expect(sql).toContain("CREATE TABLE deal_customer_inn_registry");
    expect(sql).toContain("inn_normalized varchar(12) NOT NULL");
    expect(sql).toContain("canonical_deal_id int NULL");
    expect(sql).not.toContain("canonical_deal_id int unsigned");
    expect(sql).toContain("PRIMARY KEY (inn_normalized)");
    expect(sql).toContain("created_at datetime(6)");
    expect(sql).toContain("updated_at datetime(6)");
    expect(sql).toContain(
      "FOREIGN KEY (canonical_deal_id) REFERENCES deals(id) ON DELETE SET NULL",
    );
    expect(sql).toContain(
      "SET deal.responsible_manager_id = creator.id",
    );
    expect(sql).toContain(
      "secondary_role.name IN ('partner_manager', 'super_admin')",
    );
    expect(sql).toContain("manager_user.is_activated = 1");
    expect(sql).toContain("manager_secondary_role.name = 'partner_manager'");
    expect(sql).toContain("membership.status = 'accept'");
    expect(sql).toContain(
      "HAVING COUNT(DISTINCT candidate.company_id) = 1",
    );
    expect(sql).toContain(
      "COUNT(DISTINCT candidate.responsible_manager_id) = 1",
    );

    const backfillCalls = query.mock.calls.filter(([statement]) =>
      compactSql(statement).startsWith("UPDATE customers SET inn_normalized"),
    );
    expect(backfillCalls.map(([, parameters]) => parameters)).toEqual([
      ["7707083893", 1],
      ["500100732259", 2],
    ]);

    const registryCalls = query.mock.calls.filter(([statement]) =>
      compactSql(statement).startsWith(
        "INSERT INTO deal_customer_inn_registry",
      ),
    );
    expect(registryCalls.map(([, parameters]) => parameters)).toEqual([
      ["7707083893", 10],
      ["500100732259", 20],
    ]);

    const duplicateUpdateCalls = query.mock.calls.filter(([statement]) =>
      compactSql(statement).includes(
        "SET duplicate_of_deal_id = ?, duplicate_review_status = 'pending'",
      ),
    );
    expect(duplicateUpdateCalls.map(([, parameters]) => parameters)).toEqual([
      [10, 11],
    ]);
    expect(
      query.mock.calls.some(([, parameters]) =>
        Array.isArray(parameters) ? parameters.includes(12) : false,
      ),
    ).toBe(false);

    const statements = query.mock.calls.map(([statement]) =>
      compactSql(statement),
    );
    const duplicateIndexPosition = statements.indexOf(
      "CREATE INDEX IDX_deals_duplicate_of_deal_id ON deals (duplicate_of_deal_id)",
    );
    const duplicateForeignKeyPosition = statements.indexOf(
      "ALTER TABLE deals ADD CONSTRAINT FK_deals_duplicate_of_deal FOREIGN KEY (duplicate_of_deal_id) REFERENCES deals(id) ON DELETE SET NULL",
    );
    const managerIndexPosition = statements.indexOf(
      "CREATE INDEX IDX_deals_responsible_manager_id ON deals (responsible_manager_id)",
    );
    const managerForeignKeyPosition = statements.indexOf(
      "ALTER TABLE deals ADD CONSTRAINT FK_deals_responsible_manager FOREIGN KEY (responsible_manager_id) REFERENCES users(id) ON DELETE SET NULL",
    );
    const registryCreatePosition = statements.findIndex((statement) =>
      statement.startsWith("CREATE TABLE deal_customer_inn_registry"),
    );
    const registryInsertPosition = statements.findIndex((statement) =>
      statement.startsWith("INSERT INTO deal_customer_inn_registry"),
    );

    expect(duplicateIndexPosition).toBeGreaterThanOrEqual(0);
    expect(duplicateIndexPosition).toBeLessThan(duplicateForeignKeyPosition);
    expect(managerIndexPosition).toBeGreaterThanOrEqual(0);
    expect(managerIndexPosition).toBeLessThan(managerForeignKeyPosition);
    expect(registryCreatePosition).toBeGreaterThanOrEqual(0);
    expect(registryCreatePosition).toBeLessThan(registryInsertPosition);
  });

  it("is idempotent when all columns, indexes, constraints and table exist", async () => {
    const customerTable = {
      indices: [
        {
          name: "IDX_customers_inn_normalized",
          columnNames: ["inn_normalized"],
        },
        {
          name: "IDX_customers_bitrix24_company_id",
          columnNames: ["bitrix24_company_id"],
        },
      ],
      foreignKeys: [],
    };
    const dealsTable = {
      indices: [
        {
          name: "IDX_deals_responsible_manager_id",
          columnNames: ["responsible_manager_id"],
        },
        {
          name: "IDX_deals_duplicate_reviewed_by_user_id",
          columnNames: ["duplicate_reviewed_by_user_id"],
        },
        {
          name: "IDX_deals_duplicate_of_deal_id",
          columnNames: ["duplicate_of_deal_id"],
        },
        {
          name: "IDX_deals_manager_duplicate_review",
          columnNames: [
            "responsible_manager_id",
            "duplicate_review_status",
          ],
        },
      ],
      foreignKeys: [
        {
          name: "FK_deals_responsible_manager",
          columnNames: ["responsible_manager_id"],
          referencedTableName: "users",
        },
        {
          name: "FK_deals_duplicate_reviewed_by_user",
          columnNames: ["duplicate_reviewed_by_user_id"],
          referencedTableName: "users",
        },
        {
          name: "FK_deals_duplicate_of_deal",
          columnNames: ["duplicate_of_deal_id"],
          referencedTableName: "deals",
        },
      ],
    };
    const queryRunner = {
      query: jest.fn(async (statement: string) =>
        compactSql(statement).startsWith("SELECT id, inn FROM customers")
          ? []
          : undefined,
      ),
      hasColumn: jest.fn().mockResolvedValue(true),
      hasTable: jest.fn().mockResolvedValue(true),
      getTable: jest.fn(async (tableName: string) =>
        tableName === "customers" ? customerTable : dealsTable,
      ),
    };

    await new AddDealDuplicateWorkflowFoundation1780317500000().up(
      queryRunner as any,
    );

    const sql = queryRunner.query.mock.calls
      .map(([statement]) => compactSql(statement))
      .join("\n");
    expect(sql).not.toMatch(/\bALTER\b/u);
    expect(sql).not.toMatch(/\bCREATE\b/u);
    expect(sql).toContain(
      "SELECT id, inn FROM customers WHERE inn_normalized IS NULL",
    );
    expect(sql).toContain("UPDATE deals deal INNER JOIN users creator");
    expect(sql).toContain("SELECT deal.id, deal.duplicate_review_status");
  });

  it("replaces the legacy Bitrix company UNIQUE index with a non-unique lookup index", async () => {
    let customerIndexes: Array<{
      name: string;
      columnNames: string[];
      isUnique?: boolean;
    }> = [
      {
        name: "unique_customers_bitrix24_company_id",
        columnNames: ["bitrix24_company_id"],
        isUnique: true,
      },
    ];
    const dealsTable = {
      indices: [
        {
          name: "IDX_deals_responsible_manager_id",
          columnNames: ["responsible_manager_id"],
        },
        {
          name: "IDX_deals_duplicate_reviewed_by_user_id",
          columnNames: ["duplicate_reviewed_by_user_id"],
        },
        {
          name: "IDX_deals_duplicate_of_deal_id",
          columnNames: ["duplicate_of_deal_id"],
        },
        {
          name: "IDX_deals_manager_duplicate_review",
          columnNames: [
            "responsible_manager_id",
            "duplicate_review_status",
          ],
        },
      ],
      foreignKeys: [
        {
          name: "FK_deals_responsible_manager",
          columnNames: ["responsible_manager_id"],
          referencedTableName: "users",
        },
        {
          name: "FK_deals_duplicate_reviewed_by_user",
          columnNames: ["duplicate_reviewed_by_user_id"],
          referencedTableName: "users",
        },
        {
          name: "FK_deals_duplicate_of_deal",
          columnNames: ["duplicate_of_deal_id"],
          referencedTableName: "deals",
        },
      ],
    };
    const query = jest.fn(async (statement: string) => {
      const sql = compactSql(statement);
      if (
        sql.startsWith("SELECT id, inn FROM customers") ||
        sql.startsWith("SELECT deal.id, deal.duplicate_review_status")
      ) {
        return [];
      }
      if (
        sql ===
        "DROP INDEX unique_customers_bitrix24_company_id ON customers"
      ) {
        customerIndexes = customerIndexes.filter(
          ({ name }) => name !== "unique_customers_bitrix24_company_id",
        );
      }
      if (
        sql ===
        "CREATE INDEX IDX_customers_inn_normalized ON customers (inn_normalized)"
      ) {
        customerIndexes.push({
          name: "IDX_customers_inn_normalized",
          columnNames: ["inn_normalized"],
          isUnique: false,
        });
      }
      if (
        sql ===
        "CREATE INDEX IDX_customers_bitrix24_company_id ON customers (bitrix24_company_id)"
      ) {
        customerIndexes.push({
          name: "IDX_customers_bitrix24_company_id",
          columnNames: ["bitrix24_company_id"],
          isUnique: false,
        });
      }
      return undefined;
    });
    const queryRunner = {
      query,
      hasColumn: jest.fn().mockResolvedValue(true),
      hasTable: jest.fn().mockResolvedValue(true),
      getTable: jest.fn(async (tableName: string) =>
        tableName === "customers"
          ? { indices: customerIndexes, foreignKeys: [] }
          : dealsTable,
      ),
    };

    await new AddDealDuplicateWorkflowFoundation1780317500000().up(
      queryRunner as any,
    );

    const statements = query.mock.calls.map(([statement]) =>
      compactSql(statement),
    );
    const dropPosition = statements.indexOf(
      "DROP INDEX unique_customers_bitrix24_company_id ON customers",
    );
    const createPosition = statements.indexOf(
      "CREATE INDEX IDX_customers_bitrix24_company_id ON customers (bitrix24_company_id)",
    );
    expect(dropPosition).toBeGreaterThanOrEqual(0);
    expect(createPosition).toBeGreaterThan(dropPosition);
    expect(customerIndexes).toContainEqual({
      name: "IDX_customers_bitrix24_company_id",
      columnNames: ["bitrix24_company_id"],
      isUnique: false,
    });
    expect(customerIndexes.some(({ isUnique }) => isUnique)).toBe(false);
  });

  it("drops foreign keys before indexes and new columns without removing the legacy duplicate column", async () => {
    const dealsTable = {
      indices: [
        { name: "IDX_deals_duplicate_of_deal_id" },
        { name: "IDX_deals_duplicate_reviewed_by_user_id" },
        { name: "IDX_deals_responsible_manager_id" },
        { name: "IDX_deals_manager_duplicate_review" },
      ],
      foreignKeys: [
        { name: "FK_deals_duplicate_of_deal" },
        { name: "FK_deals_duplicate_reviewed_by_user" },
        { name: "FK_deals_responsible_manager" },
      ],
    };
    const customersTable = {
      indices: [
        {
          name: "IDX_customers_inn_normalized",
          columnNames: ["inn_normalized"],
        },
        {
          name: "IDX_customers_bitrix24_company_id",
          columnNames: ["bitrix24_company_id"],
        },
      ],
      foreignKeys: [],
    };
    const queryRunner = {
      query: jest.fn().mockResolvedValue(undefined),
      hasColumn: jest.fn().mockResolvedValue(true),
      hasTable: jest.fn().mockResolvedValue(true),
      getTable: jest.fn(async (tableName: string) =>
        tableName === "customers" ? customersTable : dealsTable,
      ),
    };

    await new AddDealDuplicateWorkflowFoundation1780317500000().down(
      queryRunner as any,
    );

    const statements = queryRunner.query.mock.calls.map(([statement]) =>
      compactSql(statement),
    );
    const sql = statements.join("\n");
    expect(statements[0]).toBe("DROP TABLE deal_customer_inn_registry");
    expect(
      statements.indexOf(
        "ALTER TABLE deals DROP FOREIGN KEY FK_deals_responsible_manager",
      ),
    ).toBeLessThan(
      statements.indexOf(
        "DROP INDEX IDX_deals_responsible_manager_id ON deals",
      ),
    );
    expect(
      statements.indexOf(
        "DROP INDEX IDX_deals_responsible_manager_id ON deals",
      ),
    ).toBeLessThan(
      statements.indexOf(
        "ALTER TABLE deals DROP COLUMN responsible_manager_id",
      ),
    );
    expect(sql).toContain(
      "DROP INDEX IDX_deals_manager_duplicate_review ON deals",
    );
    expect(sql).not.toContain("DROP COLUMN duplicate_of_deal_id");
    expect(sql).not.toContain("DROP COLUMN duplicate_review_status");
    expect(sql).toContain(
      "DROP INDEX IDX_customers_inn_normalized ON customers",
    );
    expect(sql).toContain(
      "UPDATE customers later_customer INNER JOIN customers earlier_customer",
    );
    expect(sql).toContain(
      "earlier_customer.id < later_customer.id SET later_customer.bitrix24_company_id = NULL",
    );
    expect(sql).toContain(
      "CREATE UNIQUE INDEX unique_customers_bitrix24_company_id ON customers (bitrix24_company_id)",
    );
    expect(
      statements.indexOf(
        "UPDATE customers later_customer INNER JOIN customers earlier_customer ON earlier_customer.bitrix24_company_id = later_customer.bitrix24_company_id AND earlier_customer.id < later_customer.id SET later_customer.bitrix24_company_id = NULL WHERE later_customer.bitrix24_company_id IS NOT NULL",
      ),
    ).toBeLessThan(
      statements.indexOf(
        "CREATE UNIQUE INDEX unique_customers_bitrix24_company_id ON customers (bitrix24_company_id)",
      ),
    );
    expect(statements.at(-1)).toBe(
      "ALTER TABLE customers DROP COLUMN inn_normalized",
    );
  });

  it("does not rewrite Bitrix mappings when the legacy UNIQUE index already exists on rollback", async () => {
    const customersTable = {
      indices: [
        {
          name: "unique_customers_bitrix24_company_id",
          columnNames: ["bitrix24_company_id"],
          isUnique: true,
        },
      ],
      foreignKeys: [],
    };
    const queryRunner = {
      query: jest.fn().mockResolvedValue(undefined),
      hasColumn: jest.fn(async (_table: string, column: string) =>
        column === "bitrix24_company_id",
      ),
      hasTable: jest.fn().mockResolvedValue(false),
      getTable: jest.fn(async (tableName: string) =>
        tableName === "customers"
          ? customersTable
          : { indices: [], foreignKeys: [] },
      ),
    };

    await new AddDealDuplicateWorkflowFoundation1780317500000().down(
      queryRunner as any,
    );

    const sql = queryRunner.query.mock.calls
      .map(([statement]) => compactSql(statement))
      .join("\n");
    expect(sql).not.toContain("DROP INDEX unique_customers_bitrix24_company_id");
    expect(sql).not.toContain("UPDATE customers later_customer");
    expect(sql).not.toContain("CREATE UNIQUE INDEX");
  });
});
