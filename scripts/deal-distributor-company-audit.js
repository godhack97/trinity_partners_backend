#!/usr/bin/env node

"use strict";

const path = require("node:path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");
const {
  buildDistributorCompanyAudit,
  normalizeCompanyName,
} = require("./lib/deal-distributor-company-audit.cjs");

const projectRoot = path.resolve(__dirname, "..");
const requestedEnvFile = process.env.AUDIT_ENV_FILE || ".env.dev";

function refuse(message) {
  throw new Error(`Deal distributor company audit refused: ${message}`);
}

function repositoryPath(requestedPath, label) {
  if (!requestedPath) refuse(`${label} cannot be empty`);
  if (path.isAbsolute(requestedPath) || requestedPath.split(/[\\/]/).includes("..")) {
    refuse(`${label} must point to a file inside the backend repository`);
  }

  const resolved = path.resolve(projectRoot, requestedPath);
  const relative = path.relative(projectRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    refuse(`${label} resolves outside the backend repository`);
  }
  return resolved;
}

const envFile = repositoryPath(requestedEnvFile, "AUDIT_ENV_FILE");
dotenv.config({ path: envFile });

const environment = (process.env.NODE_ENV || "dev").trim().toLowerCase();
const host = (process.env.DATABASE_HOST || "").trim().toLowerCase();
const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);

if (environment === "prod" || environment === "production") {
  refuse("NODE_ENV is prod/production; use a separately approved production process");
}
if (!localHosts.has(host)) refuse(`database host is not local (${host || "<empty>"})`);

const connectionOptions = {
  host,
  port: Number(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USERNAME?.trim(),
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME?.trim(),
};

for (const [key, value] of Object.entries(connectionOptions)) {
  if (
    value === undefined ||
    value === "" ||
    (key === "port" && (!Number.isInteger(value) || value <= 0))
  ) {
    refuse(`missing or invalid local database setting: ${key}`);
  }
}

function isoDate(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function ownerFromRow(row) {
  if (row.owner_user_id === null || row.owner_user_id === undefined) return null;

  return {
    id: Number(row.owner_user_id),
    email: row.owner_email,
    first_name: row.owner_first_name,
    last_name: row.owner_last_name,
    is_activated: Boolean(row.owner_is_activated),
    deleted_at: isoDate(row.owner_deleted_at),
  };
}

async function run() {
  const connection = await mysql.createConnection(connectionOptions);

  try {
    await connection.query("START TRANSACTION READ ONLY");

    const [distributorRows] = await connection.query(`
      SELECT id, name, deleted_at
      FROM distributors
      ORDER BY id
    `);
    const [companyRows] = await connection.query(`
      SELECT
        company.id,
        company.name,
        company.partnership_type,
        company.status,
        company.owner_id,
        company.deleted_at,
        owner_user.id AS owner_user_id,
        owner_user.email AS owner_email,
        owner_user.is_activated AS owner_is_activated,
        owner_user.deleted_at AS owner_deleted_at,
        owner_info.first_name AS owner_first_name,
        owner_info.last_name AS owner_last_name
      FROM companies company
      LEFT JOIN users owner_user ON owner_user.id = company.owner_id
      LEFT JOIN users_info owner_info ON owner_info.user_id = owner_user.id
      ORDER BY company.id
    `);
    const [dealCountRows] = await connection.query(`
      SELECT distributor_id, COUNT(*) AS affected_nondeleted_deals
      FROM deals
      WHERE deleted_at IS NULL
        AND distributor_id IS NOT NULL
      GROUP BY distributor_id
      ORDER BY distributor_id
    `);

    const distributors = distributorRows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      state: row.deleted_at ? "soft_deleted" : "active",
      deleted_at: isoDate(row.deleted_at),
    }));
    const companies = companyRows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      normalized_name: normalizeCompanyName(row.name),
      partnership_type: row.partnership_type,
      status: row.status,
      state: row.deleted_at ? "soft_deleted" : "active",
      deleted_at: isoDate(row.deleted_at),
      owner_id: row.owner_id === null ? null : Number(row.owner_id),
      owner: ownerFromRow(row),
    }));
    const dealCountsByDistributorId = new Map(
      dealCountRows.map((row) => [
        Number(row.distributor_id),
        Number(row.affected_nondeleted_deals),
      ]),
    );
    const audit = buildDistributorCompanyAudit({
      distributors,
      companies,
      dealCountsByDistributorId,
    });

    await connection.rollback();

    console.log(
      JSON.stringify(
        {
          scope: "legacy deal distributors to canonical distributor companies",
          mode: "read-only",
          env_file: path.basename(envFile),
          normalization:
            "Unicode NFKC, trim, collapse whitespace, case-fold with ru-RU locale",
          ...audit.summary,
          distributors: audit.rows,
        },
        null,
        2,
      ),
    );

    // Exit 2 is a valid completed audit whose data is not migration-ready.
    if (!audit.summary.migration_ready) process.exitCode = 2;
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
  console.error(
    `Deal distributor company audit failed: ${
      [...new Set(details)].join(": ") || "unknown error"
    }`,
  );
  process.exitCode = 1;
});
