#!/usr/bin/env node

require("reflect-metadata");

const crypto = require("node:crypto");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");
const { DataSource } = require("typeorm");

const projectRoot = path.resolve(__dirname, "..");
const requestedEnvFile = process.env.AUDIT_ENV_FILE || ".env.dev";
const databasePrefix = "trinity_partner_transition_audit_";

function refuse(message) {
  throw new Error(`Partner transition persistence smoke refused: ${message}`);
}

if (path.isAbsolute(requestedEnvFile) || requestedEnvFile.includes("..")) {
  refuse("AUDIT_ENV_FILE must point to a file inside the backend repository");
}

dotenv.config({ path: path.resolve(projectRoot, requestedEnvFile) });

const environment = (process.env.NODE_ENV || "dev").trim().toLowerCase();
const host = (process.env.DATABASE_HOST || "").trim().toLowerCase();
const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);

if (environment === "prod" || environment === "production") {
  refuse("NODE_ENV is prod/production");
}

if (!localHosts.has(host)) {
  refuse(`database host is not local (${host || "<empty>"})`);
}

const databaseConnectionOptions = (database) => ({
  host,
  port: Number(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USERNAME?.trim(),
  password: process.env.DATABASE_PASSWORD,
  ...(database ? { database } : {}),
});

for (const [key, value] of Object.entries(databaseConnectionOptions())) {
  if (
    value === undefined ||
    value === "" ||
    (key === "port" && !Number.isInteger(value))
  ) {
    refuse(`missing or invalid local database setting: ${key}`);
  }
}

function createDatabaseName() {
  return (
    process.env.PARTNER_TRANSITION_SMOKE_DATABASE ||
    `${databasePrefix}${process.pid}_${crypto.randomBytes(4).toString("hex")}`
  );
}

function assertSafeDatabaseName(databaseName) {
  if (!new RegExp(`^${databasePrefix}[a-z0-9_]+$`).test(databaseName)) {
    refuse(
      `PARTNER_TRANSITION_SMOKE_DATABASE must start with ${databasePrefix} ` +
        "and contain only lowercase letters, digits and underscores",
    );
  }

  if (databaseName === process.env.DATABASE_NAME) {
    refuse("temporary database matches the configured application database");
  }
}

function runMigrations(databaseName) {
  const result = spawnSync("npm", ["run", "migration:run"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      DATABASE_NAME: databaseName,
      NODE_ENV: "dev",
    },
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024,
  });

  if (result.status !== 0) {
    const output = `${result.stdout || ""}\n${result.stderr || ""}`;
    throw new Error(`Fresh database migration failed:\n${output.slice(-12000)}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

async function seedFixtures(connection) {
  const [roles] = await connection.query(
    "SELECT id, name FROM roles WHERE name IN (?, ?)",
    ["super_admin", "partner"],
  );
  const roleIds = new Map(roles.map((role) => [role.name, role.id]));

  for (const role of ["super_admin", "partner"]) {
    if (!roleIds.has(role)) throw new Error(`Required migrated role is missing: ${role}`);
  }

  const [validatorResult] = await connection.query(
    `
      INSERT INTO users (
        password, salt, email, is_activated, email_confirmed, role_id
      ) VALUES (?, ?, ?, 1, 1, ?)
    `,
    [
      "!",
      "partner-transition-smoke",
      "validator@partner-transition-smoke.invalid",
      roleIds.get("super_admin"),
    ],
  );

  const fixtures = [
    { operation: "accept", companyStatus: "pending", employeeStatus: "pending" },
    { operation: "restore", companyStatus: "reject", employeeStatus: "reject" },
    { operation: "resume", companyStatus: "suspended", employeeStatus: "accept" },
  ];

  for (const [index, fixture] of fixtures.entries()) {
    const [ownerResult] = await connection.query(
      `
        INSERT INTO users (
          password, salt, email, is_activated, email_confirmed, role_id
        ) VALUES (?, ?, ?, 0, 1, ?)
      `,
      [
        "!",
        "partner-transition-smoke",
        `${fixture.operation}@partner-transition-smoke.invalid`,
        roleIds.get("partner"),
      ],
    );

    const [companyResult] = await connection.query(
      `
        INSERT INTO companies (
          owner_id,
          name,
          inn,
          company_business_line,
          employees_count,
          site_url,
          promoted_products,
          products_of_interest,
          main_customers,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        ownerResult.insertId,
        `Partner transition ${fixture.operation}`,
        `audit-${process.pid}-${index}`,
        "Audit fixture",
        1,
        "https://partner-transition-smoke.invalid",
        "Audit fixture",
        "Audit fixture",
        "Audit fixture",
        fixture.companyStatus,
      ],
    );

    const [employeeResult] = await connection.query(
      `
        INSERT INTO company_employees (company_id, employee_id, status)
        VALUES (?, ?, ?)
      `,
      [companyResult.insertId, ownerResult.insertId, fixture.employeeStatus],
    );

    Object.assign(fixture, {
      companyId: companyResult.insertId,
      employeeId: employeeResult.insertId,
      ownerId: ownerResult.insertId,
    });
  }

  return { fixtures, validatorId: validatorResult.insertId };
}

function createApplicationDataSource(databaseName) {
  const { user, ...connectionOptions } = databaseConnectionOptions(databaseName);
  return new DataSource({
    type: "mysql",
    ...connectionOptions,
    username: user,
    entities: [path.resolve(projectRoot, "dist/src/**/*.entity.js")],
    synchronize: false,
    logging: false,
  });
}

function createPartnerService(dataSource, capturedEmails) {
  const entities = require("../dist/src/orm/entities");
  const repositories = require("../dist/src/orm/repositories");
  const AdminPartnerService = require(
    "../dist/src/api/admin/partner/admin-partner.service",
  ).default;
  const { NotificationService } = require(
    "../dist/src/api/notification/notification.service",
  );

  const companyRepository = new repositories.CompanyRepository(
    dataSource.getRepository(entities.CompanyEntity),
  );
  const companyEmployeeRepository = new repositories.CompanyEmployeeRepository(
    dataSource.getRepository(entities.CompanyEmployeeEntity),
  );
  const userRepository = new repositories.UserRepository(
    dataSource.getRepository(entities.UserEntity),
    dataSource.getRepository(entities.UserToken),
  );
  const notificationRepository = new repositories.NotificationRepository(
    dataSource.getRepository(entities.NotificationEntity),
  );
  const notificationService = new NotificationService(
    userRepository,
    new repositories.UserSettingRepository(
      dataSource.getRepository(entities.UserSettingEntity),
    ),
    notificationRepository,
    {
      async sendMail() {
        throw new Error("Notification SMTP adapter must not run in persistence smoke");
      },
    },
    {
      get() {
        return "no-reply@partner-transition-smoke.invalid";
      },
    },
  );
  const emailConfirmer = {
    async emailSend(message) {
      if (!message.email?.endsWith(".invalid")) {
        throw new Error("Refusing email adapter call outside the reserved .invalid domain");
      }
      capturedEmails.push(message);
      return { accepted: [message.email] };
    },
  };

  return new AdminPartnerService(
    companyRepository,
    new repositories.DealRepository(
      dataSource.getRepository(entities.DealEntity),
    ),
    companyEmployeeRepository,
    userRepository,
    emailConfirmer,
    notificationService,
  );
}

async function verifyPersistedState(connection, fixtures, validatorId, capturedEmails) {
  const [companies] = await connection.query(
    `
      SELECT id, owner_id, status, validated_by_manager_id, validated_at
      FROM companies
      ORDER BY id
    `,
  );
  const [owners] = await connection.query(
    `
      SELECT id, is_activated, manager_id
      FROM users
      WHERE id IN (?)
      ORDER BY id
    `,
    [fixtures.map((fixture) => fixture.ownerId)],
  );
  const [employees] = await connection.query(
    `
      SELECT id, status
      FROM company_employees
      ORDER BY id
    `,
  );
  const [notifications] = await connection.query(
    `
      SELECT user_id, title, type, category, actions
      FROM notifications
      ORDER BY id
    `,
  );

  assertEqual(companies.length, fixtures.length, "persisted company count");
  assertEqual(owners.length, fixtures.length, "persisted owner count");
  assertEqual(employees.length, fixtures.length, "persisted company employee count");
  assertEqual(notifications.length, fixtures.length, "persisted notification count");
  assertEqual(capturedEmails.length, fixtures.length, "captured transition email count");

  for (const fixture of fixtures) {
    const company = companies.find((row) => row.id === fixture.companyId);
    const owner = owners.find((row) => row.id === fixture.ownerId);
    const employee = employees.find((row) => row.id === fixture.employeeId);
    const notification = notifications.find((row) => row.user_id === fixture.ownerId);
    const email = capturedEmails.find(
      (message) => message.email === `${fixture.operation}@partner-transition-smoke.invalid`,
    );

    assertEqual(company?.status, "accept", `${fixture.operation} company status`);
    assertEqual(
      company?.validated_by_manager_id,
      validatorId,
      `${fixture.operation} validator`,
    );
    if (!company?.validated_at) {
      throw new Error(`${fixture.operation} validation timestamp was not persisted`);
    }
    assertEqual(owner?.is_activated, 1, `${fixture.operation} owner activation`);
    assertEqual(employee?.status, "accept", `${fixture.operation} employee status`);
    assertEqual(notification?.type, "site", `${fixture.operation} notification type`);
    assertEqual(notification?.category, "company", `${fixture.operation} notification category`);
    if (!notification?.title || !notification?.actions) {
      throw new Error(`${fixture.operation} notification payload was not persisted`);
    }
    if (!email) throw new Error(`${fixture.operation} email adapter call is missing`);
  }

  const acceptOwner = owners.find((row) => row.id === fixtures[0].ownerId);
  assertEqual(acceptOwner?.manager_id, validatorId, "accept owner manager");
}

async function main() {
  const databaseName = createDatabaseName();
  assertSafeDatabaseName(databaseName);

  const serverConnection = await mysql.createConnection(databaseConnectionOptions());
  let dataSource;

  try {
    const [existing] = await serverConnection.query(
      "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?",
      [databaseName],
    );
    if (existing.length > 0) {
      refuse(`temporary database already exists: ${databaseName}`);
    }

    await serverConnection.query(
      `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`,
    );
    runMigrations(databaseName);

    const fixtureConnection = await mysql.createConnection(
      databaseConnectionOptions(databaseName),
    );
    let seeded;
    try {
      seeded = await seedFixtures(fixtureConnection);
    } finally {
      await fixtureConnection.end();
    }

    dataSource = createApplicationDataSource(databaseName);
    await dataSource.initialize();

    const capturedEmails = [];
    const partnerService = createPartnerService(dataSource, capturedEmails);
    const validator = await dataSource
      .getRepository(require("../dist/src/orm/entities").UserEntity)
      .findOneByOrFail({ id: seeded.validatorId });

    for (const fixture of seeded.fixtures) {
      await partnerService[fixture.operation](fixture.companyId, validator);
    }

    const verificationConnection = await mysql.createConnection(
      databaseConnectionOptions(databaseName),
    );
    try {
      await verifyPersistedState(
        verificationConnection,
        seeded.fixtures,
        seeded.validatorId,
        capturedEmails,
      );
    } finally {
      await verificationConnection.end();
    }

    console.log(
      "Partner transition persistence smoke OK: accept/restore/resume, " +
        "3 persisted site notifications, 3 isolated .invalid email adapter calls.",
    );
  } finally {
    try {
      if (dataSource?.isInitialized) await dataSource.destroy();
    } finally {
      try {
        await serverConnection.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
      } finally {
        await serverConnection.end();
      }
    }
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
