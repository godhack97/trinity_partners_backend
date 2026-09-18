#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const dotenv = require("dotenv");

const projectDir = path.resolve(__dirname, "..");
const workspaceDir = path.resolve(projectDir, "..");
const environment = String(process.env.NODE_ENV || "prod").trim();
const envFile = process.env.BACKUP_ENV_FILE || path.join(projectDir, `.env.${environment}`);
const fileConfig = fs.existsSync(envFile)
  ? dotenv.parse(fs.readFileSync(envFile))
  : {};
const config = { ...fileConfig, ...process.env };
const backupRoot = path.resolve(config.BACKUP_DIR || "/var/backups/trinity");
const metricsDir = path.resolve(config.OPS_METRICS_DIR || path.join(workspaceDir, "ops/metrics"));
const databaseUsername =
  config.RESTORE_CHECK_DATABASE_USERNAME || config.DATABASE_USERNAME;
const databasePassword =
  config.RESTORE_CHECK_DATABASE_PASSWORD || config.DATABASE_PASSWORD;
if (!databaseUsername || !databasePassword) {
  throw new Error("Missing restore-check database credentials");
}
const databaseName = `trinity_restore_check_${Date.now()}`;
if (!/^trinity_restore_check_\d+$/.test(databaseName)) throw new Error("Unsafe restore database name");
const childEnv = { ...process.env, MYSQL_PWD: databasePassword };
const connectionArgs = [
  "--protocol=TCP",
  `--host=${config.DATABASE_HOST}`,
  `--port=${config.DATABASE_PORT}`,
  `--user=${databaseUsername}`,
];

const runMysql = (sql, targetDatabase) => {
  const args = [...connectionArgs];
  if (targetDatabase) args.push(`--database=${targetDatabase}`);
  args.push(`--execute=${sql}`);
  const result = spawnSync("mariadb", args, { env: childEnv, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || "mariadb failed");
  return result.stdout;
};

const writeMetric = (name, value) => {
  fs.mkdirSync(metricsDir, { recursive: true, mode: 0o750 });
  const target = path.join(metricsDir, `${name}.prom`);
  fs.writeFileSync(target, `# TYPE ${name} gauge\n${name} ${value}\n`, { mode: 0o640 });
};

const latestBackup = fs.readdirSync(backupRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d{8}T\d{6}Z$/.test(entry.name))
  .map((entry) => path.join(backupRoot, entry.name))
  .filter((directory) => fs.existsSync(path.join(directory, "COMPLETE")))
  .sort()
  .at(-1);
if (!latestBackup) throw new Error(`No complete backup in ${backupRoot}`);

const manifest = JSON.parse(fs.readFileSync(path.join(latestBackup, "manifest.json"), "utf8"));
for (const artifact of manifest.artifacts) {
  const file = path.join(latestBackup, artifact.name);
  const digest = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  if (digest !== artifact.sha256) throw new Error(`Checksum mismatch: ${artifact.name}`);
}

async function restore() {
  runMysql(`CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  try {
    await new Promise((resolve, reject) => {
      const unzip = spawn("gzip", ["-dc", path.join(latestBackup, "database.sql.gz")], { stdio: ["ignore", "pipe", "inherit"] });
      const mysql = spawn("mariadb", [...connectionArgs, `--database=${databaseName}`], { env: childEnv, stdio: ["pipe", "inherit", "inherit"] });
      unzip.stdout.pipe(mysql.stdin);
      let unzipStatus;
      let mysqlStatus;
      const finish = () => {
        if (unzipStatus === undefined || mysqlStatus === undefined) return;
        if (unzipStatus === 0 && mysqlStatus === 0) resolve();
        else reject(new Error(`Restore pipeline failed: gzip=${unzipStatus}, mariadb=${mysqlStatus}`));
      };
      unzip.on("close", (code) => { unzipStatus = code; finish(); });
      mysql.on("close", (code) => { mysqlStatus = code; finish(); });
    });
    const count = Number(runMysql("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()", databaseName).trim().split(/\s+/).at(-1));
    if (!Number.isFinite(count) || count < 1) throw new Error("Restored database has no tables");
    const tarCheck = spawnSync("tar", ["-tzf", path.join(latestBackup, "files.tar.gz")], { stdio: "ignore" });
    if (tarCheck.status !== 0) throw new Error("File archive cannot be read");
    writeMetric("trinity_restore_check_last_success_timestamp_seconds", Math.floor(Date.now() / 1000));
    writeMetric("trinity_restore_check_status", 1);
    process.stdout.write(`Restore check OK: ${count} tables from ${latestBackup}\n`);
  } finally {
    runMysql(`DROP DATABASE IF EXISTS \`${databaseName}\``);
  }
}

restore().catch((error) => {
  writeMetric("trinity_restore_check_last_failure_timestamp_seconds", Math.floor(Date.now() / 1000));
  writeMetric("trinity_restore_check_status", 0);
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
