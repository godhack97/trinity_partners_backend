#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

const action = process.argv[2];
const envFile = process.env.COMPANY_ROLLOUT_ENV || ".env";
const environment = dotenv.parse(fs.readFileSync(path.resolve(envFile)));
const database = {
  host: environment.DATABASE_HOST,
  port: Number(environment.DATABASE_PORT || 3306),
  user: environment.DATABASE_USERNAME,
  password: environment.DATABASE_PASSWORD,
  database: environment.DATABASE_NAME,
};

const required = ["host", "port", "user", "password", "database"];
for (const key of required) {
  if (!database[key]) throw new Error(`Missing database setting: ${key}`);
}

const timestamp = () => new Date().toISOString().replace(/[:.]/g, "-");

async function runReadOnlySql(filename) {
  const sql = fs.readFileSync(path.join(__dirname, filename), "utf8");
  const statements = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    if (!/^SELECT\b/i.test(statement)) {
      throw new Error(`Only SELECT is allowed in rollout checks: ${filename}`);
    }
  }

  const connection = await mysql.createConnection({
    ...database,
    charset: "utf8mb4",
  });
  try {
    console.log(
      JSON.stringify({
        action,
        database: database.database,
        host: database.host,
        statements: statements.length,
      }),
    );
    for (let index = 0; index < statements.length; index += 1) {
      const [rows] = await connection.query(statements[index]);
      console.log(`CHECK ${index + 1}`);
      console.table(rows);
    }
  } finally {
    await connection.end();
  }
}

function createBackup() {
  const backupDirectory =
    process.env.COMPANY_ROLLOUT_BACKUP_DIR ||
    path.join("/tmp", "trinity-company-management-backups");
  fs.mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
  const backupPath = path.join(
    backupDirectory,
    `${database.database}-before-company-management-${timestamp()}.sql`,
  );
  const dump = spawnSync(
    "/usr/bin/mysqldump",
    [
      `--host=${database.host}`,
      `--port=${database.port}`,
      `--user=${database.user}`,
      "--single-transaction",
      "--quick",
      "--triggers",
      "--hex-blob",
      "--default-character-set=utf8mb4",
      `--result-file=${backupPath}`,
      "--databases",
      database.database,
    ],
    {
      env: { ...process.env, MYSQL_PWD: database.password },
      encoding: "utf8",
    },
  );
  if (dump.status !== 0) {
    fs.rmSync(backupPath, { force: true });
    throw new Error(`mysqldump failed: ${(dump.stderr || "").trim()}`);
  }

  const contents = fs.readFileSync(backupPath);
  const checksum = crypto.createHash("sha256").update(contents).digest("hex");
  fs.chmodSync(backupPath, 0o600);
  console.log(
    JSON.stringify({
      action: "backup",
      database: database.database,
      host: database.host,
      path: backupPath,
      bytes: contents.length,
      sha256: checksum,
      stored_routines_and_events: "excluded_due_to_server_mysql.proc_mismatch",
    }),
  );
}

async function main() {
  if (action === "backup") return createBackup();
  if (action === "preflight") {
    return runReadOnlySql("preflight-company-management.sql");
  }
  if (action === "postflight") {
    return runReadOnlySql("postflight-company-management.sql");
  }
  if (action === "diagnose") {
    return runReadOnlySql("diagnose-company-management-migration.sql");
  }
  throw new Error(
    "Usage: company-management-rollout.js backup|preflight|postflight|diagnose",
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
