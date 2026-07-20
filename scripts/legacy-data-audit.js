#!/usr/bin/env node

const path = require("path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

const projectRoot = path.resolve(__dirname, "..");
const requestedEnvFile = process.env.AUDIT_ENV_FILE || ".env.dev";

function refuse(message) {
  console.error(`Legacy data audit refused: ${message}`);
  process.exit(1);
}

if (path.isAbsolute(requestedEnvFile) || requestedEnvFile.includes("..")) {
  refuse("AUDIT_ENV_FILE must point to a file inside the backend repository");
}

const envFile = path.resolve(projectRoot, requestedEnvFile);
dotenv.config({ path: envFile });

const environment = (process.env.NODE_ENV || "dev").trim().toLowerCase();
const host = (process.env.DATABASE_HOST || "").trim().toLowerCase();
const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);

if (environment === "prod" || environment === "production") {
  refuse("NODE_ENV is prod/production");
}

if (!localHosts.has(host)) {
  refuse(`database host is not local (${host || "<empty>"})`);
}

const connectionOptions = {
  host,
  port: Number(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USERNAME?.trim(),
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME?.trim(),
};

for (const [key, value] of Object.entries(connectionOptions)) {
  if (value === undefined || value === "" || (key === "port" && !Number.isInteger(value))) {
    refuse(`missing or invalid local database setting: ${key}`);
  }
}

function numericRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, Number(value || 0)]),
  );
}

async function queryOne(connection, sql) {
  const [rows] = await connection.query(sql);
  return numericRow(rows[0] || {});
}

async function groupedCounts(connection, sql, key) {
  const [rows] = await connection.query(sql);
  return Object.fromEntries(
    rows.map((row) => [row[key] === null ? "null" : String(row[key]), Number(row.total)]),
  );
}

async function run() {
  const connection = await mysql.createConnection(connectionOptions);

  try {
    await connection.query("START TRANSACTION READ ONLY");

    const [candidateColumnRows] = await connection.query(`
      SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND (
          (TABLE_NAME = 'deals' AND COLUMN_NAME IN (
            'configuration_link', 'configurations', 'distributor_id',
            'bitrix24_deal_id', 'bitrix24_integrator_contact_id', 'bitrix24_sync_status'
          ))
          OR (TABLE_NAME = 'users' AND COLUMN_NAME IN (
            'is_active', 'is_activated', 'bitrix24_contact_id', 'bitrix24_sync_status'
          ))
          OR (TABLE_NAME = 'customers' AND COLUMN_NAME = 'bitrix24_company_id')
          OR (TABLE_NAME = 'tickets' AND COLUMN_NAME = 'assignee_id')
        )
      ORDER BY TABLE_NAME, COLUMN_NAME
    `);

    const presentColumns = new Set(
      candidateColumnRows.map((row) => `${row.table_name}.${row.column_name}`),
    );
    const candidateColumns = [
      "deals.configuration_link",
      "deals.configurations",
      "deals.distributor_id",
      "deals.bitrix24_deal_id",
      "deals.bitrix24_integrator_contact_id",
      "deals.bitrix24_sync_status",
      "users.is_active",
      "users.is_activated",
      "users.bitrix24_contact_id",
      "users.bitrix24_sync_status",
      "customers.bitrix24_company_id",
      "tickets.assignee_id",
    ];

    const deals = await queryOne(connection, `
      SELECT
        COUNT(*) AS total_rows,
        SUM(deleted_at IS NULL) AS active_rows,
        SUM(deleted_at IS NOT NULL) AS archived_rows,
        SUM(NULLIF(TRIM(configuration_link), '') IS NOT NULL) AS legacy_link_rows,
        SUM(COALESCE(JSON_LENGTH(configurations), 0) > 0) AS structured_rows,
        SUM(
          NULLIF(TRIM(configuration_link), '') IS NOT NULL
          AND COALESCE(JSON_LENGTH(configurations), 0) = 0
        ) AS legacy_only_rows,
        SUM(
          NULLIF(TRIM(configuration_link), '') IS NOT NULL
          AND COALESCE(JSON_LENGTH(configurations), 0) > 0
        ) AS both_rows,
        SUM(
          NULLIF(TRIM(configuration_link), '') IS NULL
          AND COALESCE(JSON_LENGTH(configurations), 0) = 0
        ) AS neither_rows
      FROM deals
    `);

    const distributors = await queryOne(connection, `
      SELECT
        (SELECT COUNT(*) FROM distributors) AS total_rows,
        (SELECT COUNT(*) FROM distributors WHERE deleted_at IS NULL) AS active_rows,
        (SELECT COUNT(*) FROM distributors WHERE deleted_at IS NOT NULL) AS archived_rows,
        (SELECT COUNT(*) FROM deals WHERE distributor_id IS NOT NULL) AS deal_references,
        (
          SELECT COUNT(DISTINCT distributor_id)
          FROM deals
          WHERE distributor_id IS NOT NULL
        ) AS referenced_ids,
        (
          SELECT COUNT(*)
          FROM deals deal
          LEFT JOIN distributors distributor ON distributor.id = deal.distributor_id
          WHERE deal.distributor_id IS NOT NULL AND distributor.id IS NULL
        ) AS orphan_deal_references,
        (
          SELECT COUNT(*)
          FROM (
            SELECT LOWER(TRIM(name))
            FROM distributors
            WHERE deleted_at IS NULL
            GROUP BY LOWER(TRIM(name))
            HAVING COUNT(*) > 1
          ) duplicate_names
        ) AS duplicate_active_name_groups,
        (
          SELECT COUNT(*)
          FROM distributors distributor
          WHERE distributor.deleted_at IS NULL
            AND EXISTS (
              SELECT 1
              FROM companies company
              WHERE LOWER(TRIM(company.name)) = LOWER(TRIM(distributor.name))
            )
        ) AS active_rows_with_company_name_match
    `);

    const tickets = await queryOne(connection, `
      SELECT
        COUNT(*) AS total_rows,
        SUM(deleted_at IS NULL) AS active_rows,
        SUM(deleted_at IS NOT NULL) AS archived_rows,
        SUM(deleted_at IS NULL AND assignee_id IS NOT NULL) AS active_assigned_rows,
        SUM(deleted_at IS NULL AND assignee_id IS NULL) AS active_unassigned_rows
      FROM tickets
    `);

    const bitrix24 = {
      deals: await queryOne(connection, `
        SELECT
          COUNT(*) AS active_rows,
          SUM(bitrix24_deal_id IS NOT NULL) AS rows_with_deal_id,
          SUM(bitrix24_integrator_contact_id IS NOT NULL) AS rows_with_integrator_contact_id
        FROM deals
        WHERE deleted_at IS NULL
      `),
      users: await queryOne(connection, `
        SELECT
          COUNT(*) AS active_rows,
          SUM(bitrix24_contact_id IS NOT NULL) AS rows_with_contact_id
        FROM users
        WHERE deleted_at IS NULL
      `),
      customers: await queryOne(connection, `
        SELECT
          COUNT(*) AS total_rows,
          SUM(bitrix24_company_id IS NOT NULL) AS rows_with_company_id
        FROM customers
      `),
      deal_sync_statuses: await groupedCounts(
        connection,
        `
          SELECT bitrix24_sync_status AS status, COUNT(*) AS total
          FROM deals
          WHERE deleted_at IS NULL
          GROUP BY bitrix24_sync_status
          ORDER BY bitrix24_sync_status
        `,
        "status",
      ),
      user_sync_statuses: await groupedCounts(
        connection,
        `
          SELECT bitrix24_sync_status AS status, COUNT(*) AS total
          FROM users
          WHERE deleted_at IS NULL
          GROUP BY bitrix24_sync_status
          ORDER BY bitrix24_sync_status
        `,
        "status",
      ),
    };

    const ticketStatuses = await groupedCounts(
      connection,
      `
        SELECT status, COUNT(*) AS total
        FROM tickets
        WHERE deleted_at IS NULL
        GROUP BY status
        ORDER BY status
      `,
      "status",
    );

    await connection.rollback();

    console.log(
      JSON.stringify(
        {
          scope: "local read-only aggregate audit",
          env_file: path.basename(envFile),
          schema: Object.fromEntries(
            candidateColumns.map((column) => [column, presentColumns.has(column)]),
          ),
          deals,
          distributors,
          tickets: { ...tickets, statuses: ticketStatuses },
          bitrix24,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  const details = [error?.code, error?.message]
    .concat((error?.errors || []).flatMap((item) => [item?.code, item?.message]))
    .filter(Boolean);
  console.error(`Legacy data audit failed: ${[...new Set(details)].join(": ") || "unknown error"}`);
  process.exitCode = 1;
});
