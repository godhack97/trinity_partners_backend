#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");
const {
  buildBackfillPlan,
  parseMappingDocument,
} = require("./lib/ticket-assignee-backfill.cjs");

const projectRoot = path.resolve(__dirname, "..");
const requestedEnvFile = process.env.AUDIT_ENV_FILE || ".env.dev";
const execute = process.argv.includes("--execute");
const confirmation = process.argv.find((argument) => argument.startsWith("--confirm="));
const databaseConfirmation = process.argv.find((argument) =>
  argument.startsWith("--confirm-database="),
);
const mappingArgument = process.argv.find((argument) => argument.startsWith("--mapping="));

function refuse(message) {
  throw new Error(`Ticket assignee backfill refused: ${message}`);
}

function repositoryPath(requestedPath, label) {
  if (!requestedPath) return null;
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

if (execute && confirmation !== "--confirm=BACKFILL_TICKET_ASSIGNEES") {
  refuse("--execute requires --confirm=BACKFILL_TICKET_ASSIGNEES");
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
    (key === "port" && !Number.isInteger(value))
  ) {
    refuse(`missing or invalid local database setting: ${key}`);
  }
}

if (
  execute &&
  databaseConfirmation !== `--confirm-database=${connectionOptions.database}`
) {
  refuse(`--execute requires --confirm-database=${connectionOptions.database}`);
}

function readExplicitMapping() {
  if (!mappingArgument) return new Map();

  const requestedPath = mappingArgument.slice("--mapping=".length);
  if (!requestedPath) refuse("--mapping requires a repository-relative JSON path");
  const mappingPath = repositoryPath(requestedPath, "--mapping");
  if (!fs.existsSync(mappingPath)) refuse(`mapping file does not exist: ${requestedPath}`);

  let document;
  try {
    document = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
  } catch (error) {
    throw new Error(`Ticket assignee mapping is not valid JSON: ${error.message}`);
  }
  return parseMappingDocument(document);
}

async function eligibleHandlerIds(connection, roleName) {
  const [rows] = await connection.query(
    `
      SELECT DISTINCT user.id
      FROM users user
      LEFT JOIN roles primary_role ON primary_role.id = user.role_id
      LEFT JOIN user_roles user_role ON user_role.user_id = user.id
      LEFT JOIN roles secondary_role ON secondary_role.id = user_role.role_id
      WHERE user.deleted_at IS NULL
        AND user.is_activated = 1
        AND (
          (primary_role.name = ? AND primary_role.deleted_at IS NULL)
          OR (secondary_role.name = ? AND secondary_role.deleted_at IS NULL)
        )
      ORDER BY user.id
    `,
    [roleName, roleName],
  );
  return rows.map((row) => Number(row.id));
}

function summarizePlan(plan, eligibleHandlers, mappingSize) {
  const sources = {};
  for (const row of plan.planned) {
    sources[row.source] = (sources[row.source] || 0) + 1;
  }

  return {
    scope: "local ticket assignee backfill",
    mode: execute ? "execute" : "dry-run",
    mapping_entries: mappingSize,
    eligible_handlers: Object.fromEntries(
      Object.entries(eligibleHandlers).map(([role, ids]) => [
        role,
        { count: ids.length, ids },
      ]),
    ),
    active_unassigned_rows: plan.planned.length + plan.blocked.length,
    planned_rows: plan.planned.length,
    planned_sources: sources,
    planned: plan.planned,
    blocked_rows: plan.blocked.length,
    blocked: plan.blocked,
  };
}

async function run() {
  const explicitMapping = readExplicitMapping();
  const connection = await mysql.createConnection(connectionOptions);

  try {
    await connection.query(execute ? "START TRANSACTION" : "START TRANSACTION READ ONLY");

    const [tickets] = await connection.query(
      `
        SELECT
          ticket.id,
          ticket.type,
          ticket.creator_id,
          creator.manager_id AS creator_manager_id
        FROM tickets ticket
        LEFT JOIN users creator ON creator.id = ticket.creator_id
        WHERE ticket.deleted_at IS NULL
          AND ticket.assignee_id IS NULL
        ORDER BY ticket.id
        ${execute ? "FOR UPDATE" : ""}
      `,
    );
    const eligibleHandlers = {
      partner_manager: await eligibleHandlerIds(connection, "partner_manager"),
      technical_specialist: await eligibleHandlerIds(
        connection,
        "technical_specialist",
      ),
    };
    const plan = buildBackfillPlan({ tickets, eligibleHandlers, explicitMapping });
    const summary = summarizePlan(plan, eligibleHandlers, explicitMapping.size);

    if (!execute) {
      await connection.rollback();
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    if (plan.blocked.length > 0) {
      refuse(
        `${plan.blocked.length} active unassigned ticket(s) have no unambiguous eligible handler; ` +
          "provide a reviewed --mapping file before execute",
      );
    }

    for (const row of plan.planned) {
      const [result] = await connection.query(
        `
          UPDATE tickets
          SET assignee_id = ?
          WHERE id = ?
            AND assignee_id IS NULL
            AND deleted_at IS NULL
        `,
        [row.assignee_id, row.ticket_id],
      );
      if (result.affectedRows !== 1) {
        throw new Error(
          `ticket ${row.ticket_id} changed during backfill; expected one updated row`,
        );
      }
    }

    const [remainingRows] = await connection.query(
      `
        SELECT COUNT(*) AS total
        FROM tickets
        WHERE deleted_at IS NULL
          AND assignee_id IS NULL
      `,
    );
    if (Number(remainingRows[0].total) !== 0) {
      throw new Error("unassigned active tickets remain after the planned updates");
    }

    await connection.commit();
    console.log(JSON.stringify({ ...summary, committed_rows: plan.planned.length }, null, 2));
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
