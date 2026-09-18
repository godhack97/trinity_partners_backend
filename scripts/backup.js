#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const dotenv = require("dotenv");

const projectDir = path.resolve(__dirname, "..");
const workspaceDir = path.resolve(projectDir, "..");
const environment = String(process.env.NODE_ENV || "prod").trim();
const envFile = process.env.BACKUP_ENV_FILE || path.join(projectDir, `.env.${environment}`);
const fileConfig = fs.existsSync(envFile)
  ? dotenv.parse(fs.readFileSync(envFile))
  : {};
const config = { ...fileConfig, ...process.env };
const required = ["DATABASE_HOST", "DATABASE_PORT", "DATABASE_USERNAME", "DATABASE_PASSWORD", "DATABASE_NAME"];
for (const key of required) {
  if (!config[key]) throw new Error(`Missing ${key} in ${envFile}`);
}

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const backupRoot = path.resolve(config.BACKUP_DIR || "/var/backups/trinity");
const pendingDir = path.join(backupRoot, `.incomplete-${stamp}`);
const completedDir = path.join(backupRoot, stamp);
const retentionDays = Number(config.BACKUP_RETENTION_DAYS || 30);
const metricsDir = path.resolve(config.OPS_METRICS_DIR || path.join(workspaceDir, "ops/metrics"));
const childEnv = { ...process.env, MYSQL_PWD: config.DATABASE_PASSWORD };

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.status !== 0) throw new Error(`${command} exited with ${result.status}`);
};

const checksum = (file) => {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(file));
  return hash.digest("hex");
};

const writeMetric = (name, value) => {
  fs.mkdirSync(metricsDir, { recursive: true, mode: 0o750 });
  const target = path.join(metricsDir, `${name}.prom`);
  const pending = `${target}.tmp`;
  fs.writeFileSync(pending, `# TYPE ${name} gauge\n${name} ${value}\n`, { mode: 0o640 });
  fs.renameSync(pending, target);
};

try {
  fs.mkdirSync(backupRoot, { recursive: true, mode: 0o700 });
  fs.mkdirSync(pendingDir, { mode: 0o700 });

  const databaseFile = path.join(pendingDir, "database.sql");
  run("mariadb-dump", [
    "--protocol=TCP",
    `--host=${config.DATABASE_HOST}`,
    `--port=${config.DATABASE_PORT}`,
    `--user=${config.DATABASE_USERNAME}`,
    "--single-transaction",
    "--quick",
    "--triggers",
    "--hex-blob",
    `--result-file=${databaseFile}`,
    config.DATABASE_NAME,
  ], { env: childEnv });
  run("gzip", ["-9", databaseFile]);

  const filePaths = String(config.BACKUP_FILES_PATHS || "nest-trinity-backend/public,nest-trinity-backend/upload,files")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item && fs.existsSync(path.join(workspaceDir, item)));
  if (!filePaths.length) throw new Error("No configured file backup paths exist");
  const filesArchive = path.join(pendingDir, "files.tar.gz");
  run("tar", ["-C", workspaceDir, "-czf", filesArchive, ...filePaths]);
  run("gzip", ["-t", `${databaseFile}.gz`]);
  run("tar", ["-tzf", filesArchive], { stdio: "ignore" });

  const artifacts = ["database.sql.gz", "files.tar.gz"].map((name) => {
    const file = path.join(pendingDir, name);
    return { name, bytes: fs.statSync(file).size, sha256: checksum(file) };
  });
  fs.writeFileSync(
    path.join(pendingDir, "manifest.json"),
    `${JSON.stringify({ createdAt: new Date().toISOString(), database: config.DATABASE_NAME, artifacts }, null, 2)}\n`,
    { mode: 0o600 },
  );
  fs.writeFileSync(path.join(pendingDir, "COMPLETE"), `${new Date().toISOString()}\n`, { mode: 0o600 });
  fs.renameSync(pendingDir, completedDir);

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  for (const entry of fs.readdirSync(backupRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d{8}T\d{6}Z$/.test(entry.name)) continue;
    const target = path.join(backupRoot, entry.name);
    if (fs.statSync(target).mtimeMs < cutoff) fs.rmSync(target, { recursive: true });
  }

  writeMetric("trinity_backup_last_success_timestamp_seconds", Math.floor(Date.now() / 1000));
  writeMetric("trinity_backup_last_size_bytes", artifacts.reduce((sum, item) => sum + item.bytes, 0));
  writeMetric("trinity_backup_status", 1);
  process.stdout.write(`Backup complete: ${completedDir}\n`);
} catch (error) {
  writeMetric("trinity_backup_last_failure_timestamp_seconds", Math.floor(Date.now() / 1000));
  writeMetric("trinity_backup_status", 0);
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
}
