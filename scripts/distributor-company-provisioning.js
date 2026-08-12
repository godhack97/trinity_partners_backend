#!/usr/bin/env node

"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");
const {
  buildDistributorProvisioningPlan,
  parseCsv,
} = require("./lib/distributor-company-provisioning.cjs");

const backendRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(backendRoot, "..");
const EXECUTION_CONFIRMATION = "STAGE-AND-BACKFILL-DISTRIBUTORS";

function refuse(message) {
  throw new Error(`Distributor company provisioning refused: ${message}`);
}

function parseArguments(argv) {
  const options = {
    execute: false,
    confirm: "",
    mapping: "distributor-company-mapping.template.csv",
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--execute") options.execute = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--mapping" || argument === "--confirm") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) refuse(`${argument} requires a value`);
      options[argument.slice(2)] = value;
      index += 1;
    } else if (argument.startsWith("--mapping=")) {
      options.mapping = argument.slice("--mapping=".length);
    } else if (argument.startsWith("--confirm=")) {
      options.confirm = argument.slice("--confirm=".length);
    } else {
      refuse(`unknown argument ${argument}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  npm run provision:deal-distributors -- [--mapping <workspace-relative.csv>]
  npm run provision:deal-distributors -- --execute --confirm ${EXECUTION_CONFIRMATION}

Default mode is a read-only transaction. Execute mode never creates credentials:
it stages rows for owners who must self-register and only backfills deals whose
accepted distributor company, owner, membership, and PartnerManager already
reconcile exactly.`);
}

function resolveContainedFile(root, requestedPath, label) {
  if (!requestedPath) refuse(`${label} cannot be empty`);
  const resolved = path.resolve(backendRoot, requestedPath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    refuse(`${label} must point to a file inside ${root}`);
  }
  if (!fs.existsSync(resolved)) refuse(`${label} does not exist: ${requestedPath}`);

  const realRoot = fs.realpathSync(root);
  const realFile = fs.realpathSync(resolved);
  const realRelative = path.relative(realRoot, realFile);
  if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) {
    refuse(`${label} resolves outside ${root}`);
  }
  return realFile;
}

function resolveBackendEnvFile(requestedPath) {
  if (!requestedPath) refuse("DISTRIBUTOR_IMPORT_ENV_FILE cannot be empty");
  if (path.isAbsolute(requestedPath) || requestedPath.split(/[\\/]/u).includes("..")) {
    refuse("DISTRIBUTOR_IMPORT_ENV_FILE must stay inside the backend repository");
  }
  return resolveContainedFile(backendRoot, requestedPath, "environment file");
}

function validateEnvironment(options) {
  const environment = (process.env.NODE_ENV || "dev").trim().toLowerCase();
  const host = (process.env.DATABASE_HOST || "").trim().toLowerCase();
  const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);

  if (environment === "prod" || environment === "production") {
    refuse("NODE_ENV is prod/production; use a separately approved production process");
  }
  if (!localHosts.has(host)) refuse(`database host is not local (${host || "<empty>"})`);
  if (options.execute && options.confirm !== EXECUTION_CONFIRMATION) {
    refuse(`--execute requires --confirm ${EXECUTION_CONFIRMATION}`);
  }

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
  return { connectionOptions, environment };
}

async function tableExists(connection, tableName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [tableName],
  );
  return Number(rows[0]?.total || 0) === 1;
}

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [tableName, columnName],
  );
  return Number(rows[0]?.total || 0) === 1;
}

function isoDate(value) {
  return value instanceof Date ? value.toISOString() : value;
}

async function loadSnapshot(connection, schema, lockRows) {
  const lock = lockRows ? " FOR UPDATE" : "";
  const canonicalCompanyExpression = schema.has_distributor_company_id
    ? "distributor_company_id"
    : "NULL";

  const [legacyDistributors] = await connection.query(
    `SELECT id, name, deleted_at FROM distributors ORDER BY id${lock}`,
  );
  const [deals] = await connection.query(
    `SELECT id, distributor_id,
            ${canonicalCompanyExpression} AS distributor_company_id,
            deleted_at
     FROM deals
     WHERE distributor_id IS NOT NULL
     ORDER BY id${lock}`,
  );
  const [companies] = await connection.query(
    `SELECT id, name, inn, owner_id, partnership_type, status,
            responsible_manager_id, contact_email, contact_phone, deleted_at
     FROM companies
     ORDER BY id${lock}`,
  );
  const [userRows] = await connection.query(
    `SELECT users.id, users.email, users.is_activated, users.email_confirmed,
            users.deleted_at, primary_role.name AS primary_role_name
     FROM users
     LEFT JOIN roles primary_role
       ON primary_role.id = users.role_id AND primary_role.deleted_at IS NULL
     ORDER BY users.id${lock}`,
  );
  const [userInfos] = await connection.query(
    `SELECT id, user_id, first_name, last_name, phone
     FROM users_info
     ORDER BY user_id, id${lock}`,
  );
  const [secondaryRoles] = await connection.query(
    `SELECT user_role.user_id, role.name
     FROM user_roles user_role
     INNER JOIN roles role ON role.id = user_role.role_id
     WHERE role.deleted_at IS NULL
     ORDER BY user_role.user_id, role.name${lock}`,
  );
  const [memberships] = await connection.query(
    `SELECT id, company_id, employee_id, status, deleted_at
     FROM company_employees
     ORDER BY id${lock}`,
  );

  const forbiddenInns = (await tableExists(connection, "forbidden_inns"))
    ? (await connection.query(`SELECT inn FROM forbidden_inns ORDER BY id${lock}`))[0]
    : [];
  const stagedPlans = schema.has_staging_table
    ? (await connection.query(
        `SELECT legacy_distributor_id, mapping_fingerprint, status,
                resolved_owner_user_id, resolved_company_id
         FROM distributor_company_import_plans
         ORDER BY legacy_distributor_id${lock}`,
      ))[0]
    : [];

  const infoByUserId = new Map();
  for (const info of userInfos) {
    const bucket = infoByUserId.get(Number(info.user_id)) || [];
    bucket.push(info);
    infoByUserId.set(Number(info.user_id), bucket);
  }
  const rolesByUserId = new Map();
  for (const entry of secondaryRoles) {
    const bucket = rolesByUserId.get(Number(entry.user_id)) || new Set();
    bucket.add(entry.name);
    rolesByUserId.set(Number(entry.user_id), bucket);
  }
  const users = userRows.map((user) => {
    const infos = infoByUserId.get(Number(user.id)) || [];
    const roles = rolesByUserId.get(Number(user.id)) || new Set();
    if (user.primary_role_name) roles.add(user.primary_role_name);
    return {
      ...user,
      first_name: infos[0]?.first_name ?? null,
      last_name: infos[0]?.last_name ?? null,
      phone: infos[0]?.phone ?? null,
      user_info_count: infos.length,
      role_names: [...roles],
    };
  });

  const withIsoDates = (rows) => rows.map((row) => ({
    ...row,
    deleted_at: isoDate(row.deleted_at),
  }));
  return {
    legacyDistributors: withIsoDates(legacyDistributors),
    deals: withIsoDates(deals).map((deal) => ({
      ...deal,
      id: Number(deal.id),
      distributor_id: Number(deal.distributor_id),
      distributor_company_id:
        deal.distributor_company_id === null ? null : Number(deal.distributor_company_id),
    })),
    companies: withIsoDates(companies),
    users: withIsoDates(users),
    memberships: withIsoDates(memberships),
    forbiddenInns,
    stagedPlans,
  };
}

function stagingStatus(action) {
  return {
    await_owner_self_registration: "awaiting_owner_registration",
    await_admin_company_provisioning: "awaiting_company_provisioning",
    backfill_canonical_deals: "ready_for_backfill",
    already_reconciled: "reconciled",
  }[action];
}

async function executePlan(connection, plan, sourceFileSha256) {
  let stagedRows = 0;
  let backfilledDeals = 0;

  for (const row of plan.rows) {
    const mapping = row.mapping;
    const status = stagingStatus(row.action);
    if (!status) refuse(`row ${mapping.legacy_distributor_id} is not stageable`);

    await connection.query(
      `INSERT INTO distributor_company_import_plans (
        legacy_distributor_id, legacy_name, legal_company_name, inn,
        owner_first_name, owner_last_name, owner_email, owner_phone,
        responsible_manager_user_id, requested_existing_company_id,
        resolved_owner_user_id, resolved_company_id, status,
        mapping_fingerprint, source_file_sha256, last_validated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(6))
      ON DUPLICATE KEY UPDATE
        legacy_name = VALUES(legacy_name),
        legal_company_name = VALUES(legal_company_name),
        inn = VALUES(inn),
        owner_first_name = VALUES(owner_first_name),
        owner_last_name = VALUES(owner_last_name),
        owner_email = VALUES(owner_email),
        owner_phone = VALUES(owner_phone),
        responsible_manager_user_id = VALUES(responsible_manager_user_id),
        requested_existing_company_id = VALUES(requested_existing_company_id),
        resolved_owner_user_id = VALUES(resolved_owner_user_id),
        resolved_company_id = VALUES(resolved_company_id),
        status = VALUES(status),
        source_file_sha256 = VALUES(source_file_sha256),
        last_validated_at = VALUES(last_validated_at)`,
      [
        mapping.legacy_distributor_id,
        mapping.legacy_name,
        mapping.legal_company_name,
        mapping.inn,
        mapping.owner_first_name,
        mapping.owner_last_name,
        mapping.owner_email,
        mapping.owner_phone,
        mapping.responsible_manager_user_id,
        mapping.existing_company_id,
        row.resolution.owner_user_id,
        row.resolution.company_id,
        status,
        row.mapping_fingerprint,
        sourceFileSha256,
      ],
    );
    stagedRows += 1;

    if (row.action !== "backfill_canonical_deals") continue;
    const [result] = await connection.query(
      `UPDATE deals
       SET distributor_company_id = ?
       WHERE distributor_id = ?
         AND deleted_at IS NULL
         AND distributor_company_id IS NULL`,
      [row.resolution.company_id, mapping.legacy_distributor_id],
    );
    if (Number(result.affectedRows) !== row.resolution.unassigned_nondeleted_deals) {
      throw new Error(
        `Concurrent deal change detected for legacy distributor ${mapping.legacy_distributor_id}`,
      );
    }
    backfilledDeals += Number(result.affectedRows);
    await connection.query(
      `UPDATE distributor_company_import_plans
       SET status = 'reconciled', last_validated_at = CURRENT_TIMESTAMP(6)
       WHERE legacy_distributor_id = ? AND mapping_fingerprint = ?`,
      [mapping.legacy_distributor_id, row.mapping_fingerprint],
    );
  }

  return { staged_rows: stagedRows, backfilled_nondeleted_deals: backfilledDeals };
}

async function run() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const mappingFile = resolveContainedFile(workspaceRoot, options.mapping, "mapping CSV");
  const envFile = resolveBackendEnvFile(
    process.env.DISTRIBUTOR_IMPORT_ENV_FILE || ".env.dev",
  );
  dotenv.config({ path: envFile });
  const { connectionOptions, environment } = validateEnvironment(options);
  const source = fs.readFileSync(mappingFile, "utf8");
  const mappingRows = parseCsv(source);
  const sourceFileSha256 = crypto.createHash("sha256").update(source).digest("hex");
  const connection = await mysql.createConnection(connectionOptions);
  let transactionStarted = false;

  try {
    await connection.query(options.execute ? "START TRANSACTION" : "START TRANSACTION READ ONLY");
    transactionStarted = true;
    const schema = {
      has_staging_table: await tableExists(connection, "distributor_company_import_plans"),
      has_distributor_company_id: await columnExists(connection, "deals", "distributor_company_id"),
    };
    const snapshot = await loadSnapshot(connection, schema, options.execute);
    const plan = buildDistributorProvisioningPlan({
      mappingRows,
      ...snapshot,
      schema,
    });

    let writes = { staged_rows: 0, backfilled_nondeleted_deals: 0 };
    if (options.execute) {
      if (!schema.has_staging_table || !schema.has_distributor_company_id) {
        await connection.rollback();
        transactionStarted = false;
        console.log(JSON.stringify({
          scope: "legacy distributors to canonical company users",
          mode: "execute-refused",
          environment,
          env_file: path.basename(envFile),
          mapping_file: path.relative(workspaceRoot, mappingFile),
          source_file_sha256: sourceFileSha256,
          schema,
          policy: "No credentials are created. Missing owners must self-register through the portal.",
          ...plan,
        }, null, 2));
        process.exitCode = 2;
        return;
      }
      if (plan.summary.blocker_count > 0) {
        await connection.rollback();
        transactionStarted = false;
        console.log(JSON.stringify({
          scope: "legacy distributors to canonical company users",
          mode: "execute-refused",
          environment,
          env_file: path.basename(envFile),
          mapping_file: path.relative(workspaceRoot, mappingFile),
          source_file_sha256: sourceFileSha256,
          schema,
          policy: "No credentials are created. Missing owners must self-register through the portal.",
          ...plan,
        }, null, 2));
        process.exitCode = 2;
        return;
      }
      writes = await executePlan(connection, plan, sourceFileSha256);
      await connection.commit();
      transactionStarted = false;
    } else {
      await connection.rollback();
      transactionStarted = false;
    }

    console.log(JSON.stringify({
      scope: "legacy distributors to canonical company users",
      mode: options.execute ? "execute" : "read-only",
      environment,
      env_file: path.basename(envFile),
      mapping_file: path.relative(workspaceRoot, mappingFile),
      source_file_sha256: sourceFileSha256,
      schema,
      writes,
      policy: "No credentials are created. Missing owners must self-register through the portal.",
      ...plan,
    }, null, 2));

    if (
      plan.summary.blocker_count > 0 ||
      !plan.summary.schema_ready ||
      !plan.summary.backfill_ready
    ) {
      process.exitCode = 2;
    }
  } catch (error) {
    if (transactionStarted) await connection.rollback().catch(() => undefined);
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
    `Distributor company provisioning failed: ${
      [...new Set(details)].join(": ") || "unknown error"
    }`,
  );
  process.exitCode = 1;
});
