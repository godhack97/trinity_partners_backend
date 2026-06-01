const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.dev") });

const EXECUTE = process.argv.includes("--execute");
const fileArgIndex = process.argv.findIndex((arg) => arg === "--file");
const BACKUP_FILE =
  fileArgIndex >= 0 ? process.argv[fileArgIndex + 1] : process.argv.find((arg) => arg.endsWith(".json"));

const TABLES_TO_RESTORE = [
  "cnf_servers",
  "cnf_server_slots",
  "cnf_server_multislots",
  "cnf_platform_profiles",
  "cnf_platform_bays",
  "cnf_platform_forbidden_component_types",
  "cnf_components",
  "cnf_component_slots",
  "cnf_component_catalog_profiles",
  "cnf_component_resource_profiles",
  "cnf_component_price_profiles",
  "cnf_cpu_profiles",
  "cnf_ram_profiles",
  "cnf_drive_profiles",
  "cnf_controller_profiles",
  "cnf_network_profiles",
  "cnf_gpu_profiles",
  "cnf_transceiver_profiles",
  "cnf_psu_profiles",
  "cnf_service_profiles",
];

const CLEANUP_TABLES = [
  "cnf_platform_forbidden_component_types",
  "cnf_platform_bays",
  "cnf_platform_profiles",
  "cnf_server_slots",
  "cnf_server_multislots",
  "cnf_servers",
  "cnf_component_catalog_profiles",
  "cnf_component_resource_profiles",
  "cnf_component_price_profiles",
  "cnf_cpu_profiles",
  "cnf_ram_profiles",
  "cnf_drive_profiles",
  "cnf_controller_profiles",
  "cnf_network_profiles",
  "cnf_gpu_profiles",
  "cnf_transceiver_profiles",
  "cnf_psu_profiles",
  "cnf_service_profiles",
  "cnf_component_slots",
  "cnf_components",
];

function requireBackupFile() {
  if (!BACKUP_FILE) {
    throw new Error("Укажите backup JSON: --file ../backups/configurator-xlsx-rebuild-....json");
  }

  const resolved = path.resolve(process.cwd(), BACKUP_FILE);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Backup не найден: ${resolved}`);
  }

  return resolved;
}

function readBackup(file) {
  const backup = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!backup?.tables || typeof backup.tables !== "object") {
    throw new Error("Некорректный backup: отсутствует объект tables");
  }
  return backup;
}

async function insertRows(connection, table, rows) {
  for (const row of rows) {
    const columns = Object.keys(row);
    if (!columns.length) continue;

    const values = columns.map((column) => row[column]);
    const placeholders = columns.map(() => "?").join(", ");
    await connection.query(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
      values,
    );
  }
}

function summarize(backup) {
  return Object.fromEntries(
    TABLES_TO_RESTORE.map((table) => [table, backup.tables[table]?.length || 0]),
  );
}

async function restore(backup) {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT || 3306),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });

  try {
    await connection.beginTransaction();
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    for (const table of CLEANUP_TABLES) {
      await connection.query(`DELETE FROM ${table}`);
    }

    for (const table of TABLES_TO_RESTORE) {
      await insertRows(connection, table, backup.tables[table] || []);
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    await connection.commit();
  } catch (error) {
    await connection.query("SET FOREIGN_KEY_CHECKS = 1").catch(() => undefined);
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    await connection.end();
  }
}

async function main() {
  const file = requireBackupFile();
  const backup = readBackup(file);
  const summary = summarize(backup);

  console.log("Prepared configurator backup restore", {
    file,
    created_at: backup.created_at,
    execute: EXECUTE,
    summary,
  });

  if (!EXECUTE) {
    console.log("Dry-run only. Add --execute to restore database data.");
    return;
  }

  await restore(backup);
  console.log("Configurator data restored from backup", { file, summary });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
