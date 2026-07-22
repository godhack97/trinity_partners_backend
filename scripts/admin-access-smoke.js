const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const mysql = require("mysql2/promise");
const request = require("supertest");
const { of } = require("rxjs");
const { NestFactory } = require("@nestjs/core");
const { SwaggerModule, DocumentBuilder } = require("@nestjs/swagger");
const { ValidationPipe } = require("@nestjs/common");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete"]);
const INTERNAL_ROLES = [
  "super_admin",
  "employee_admin",
  "content_manager",
  "partner_manager",
  "technical_specialist",
];
const SMOKE_ROLES = [...INTERNAL_ROLES, "partner"];
const SHARED_ADMIN_ROUTE_PREFIXES = [
  "/api/configurator/componentType",
  "/api/configurator/recommended",
  "/api/documents",
  "/api/download-centr",
  "/api/logs-list",
  "/api/news",
  "/api/role",
  "/api/user",
  "/api/users",
];
const ORIGIN = "http://admin-access-smoke.invalid";
const DATABASE_PREFIX = "trinity_admin_audit_";
const OPERATION_CONCURRENCY = 1;
const snapshotPath = path.resolve(
  __dirname,
  "../src/test/admin-access-smoke.snapshot.json",
);
const shouldUpdate = process.argv.includes("--update");

const createDatabaseName = () => {
  if (process.env.ADMIN_SMOKE_DATABASE) {
    return process.env.ADMIN_SMOKE_DATABASE;
  }

  return `${DATABASE_PREFIX}${process.pid}_${crypto.randomBytes(4).toString("hex")}`;
};

const assertSafeDatabaseName = (databaseName) => {
  if (!new RegExp(`^${DATABASE_PREFIX}[a-z0-9_]+$`).test(databaseName)) {
    throw new Error(
      `ADMIN_SMOKE_DATABASE must start with ${DATABASE_PREFIX} and contain only lowercase letters, digits and underscores`,
    );
  }

  if (databaseName === process.env.DATABASE_NAME) {
    throw new Error("Refusing to use the configured application database for smoke tests");
  }
};

const databaseConnectionOptions = (database) => ({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  ...(database ? { database } : {}),
});

const runMigrations = (databaseName) => {
  const result = spawnSync("npm", ["run", "migration:run"], {
    cwd: path.resolve(__dirname, ".."),
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
    throw new Error(
      `Fresh database migration failed:\n${output.slice(-12000)}`,
    );
  }
};

const seedPrincipals = async (databaseName) => {
  const connection = await mysql.createConnection(
    databaseConnectionOptions(databaseName),
  );
  const tokens = {};

  try {
    const [roles] = await connection.query(
      `SELECT id, name FROM roles WHERE name IN (${SMOKE_ROLES.map(() => "?").join(", ")})`,
      SMOKE_ROLES,
    );
    const roleIds = new Map(roles.map((role) => [role.name, role.id]));

    for (const role of SMOKE_ROLES) {
      const roleId = roleIds.get(role);
      if (!roleId) throw new Error(`Smoke role was not migrated: ${role}`);

      const token = `admin-access-smoke-${role}`;
      const [result] = await connection.query(
        `
          INSERT INTO users (
            password,
            salt,
            email,
            is_activated,
            email_confirmed,
            role_id
          ) VALUES (?, ?, ?, 1, 1, ?)
        `,
        ["!", "admin-access-smoke", `${role}@admin-access-smoke.invalid`, roleId],
      );
      await connection.query(
        "INSERT INTO user_tokens (user_id, client_id, token) VALUES (?, ?, ?)",
        [result.insertId, ORIGIN, token],
      );
      tokens[role] = token;
    }
  } finally {
    await connection.end();
  }

  return tokens;
};

const operationPath = (route) =>
  route.replace(/\{[^}]+\}/g, "2147483647");

const hasAccess = (operation, role) => {
  const roles = operation["x-required-roles"] || [];
  const permissions = operation["x-required-permissions"] || [];
  const roleAllowed = roles.length === 0 || roles.includes(role);
  const permissionsAllowed =
    permissions.length === 0 || role === "super_admin";

  return roleAllowed && permissionsAllowed;
};

const isAdministrativeOperation = (route, method, operation) => {
  if (route.startsWith("/api/admin")) return true;

  const hasAccessContract =
    (operation["x-required-roles"] || []).length > 0 ||
    (operation["x-required-permissions"] || []).length > 0;
  if (!hasAccessContract) return false;

  if (method === "delete" && route === "/api/deal/{id}") return true;
  return SHARED_ADMIN_ROUTE_PREFIXES.some((prefix) => route.startsWith(prefix));
};

const collectAdministrativeOperations = (swagger) => {
  const operations = [];

  Object.entries(swagger.paths || {}).forEach(([route, pathItem]) => {
    Object.entries(pathItem).forEach(([method, operation]) => {
      if (!HTTP_METHODS.has(method.toLowerCase())) return;
      if (!isAdministrativeOperation(route, method.toLowerCase(), operation)) return;
      const requiredRoles = operation["x-required-roles"] || [];
      const requiredPermissions = operation["x-required-permissions"] || [];
      if (requiredRoles.length === 0 && requiredPermissions.length === 0) {
        throw new Error(
          `Admin operation has no access contract: ${method.toUpperCase()} ${route}`,
        );
      }

      operations.push({
        method: method.toLowerCase(),
        route,
        scope: route.startsWith("/api/admin") ? "admin" : "shared-admin",
        operationId: operation.operationId || null,
        requiredRoles,
        requiredPermissions,
        swaggerOperation: operation,
      });
    });
  });

  return operations.sort((left, right) =>
    `${left.method} ${left.route}`.localeCompare(`${right.method} ${right.route}`),
  );
};

const buildSnapshot = (results) => ({
  version: 2,
  principals: ["anonymous", ...SMOKE_ROLES],
  operations: results.map((result) => ({
    signature: `${result.method.toUpperCase()} ${result.route}`,
    scope: result.scope,
    operationId: result.operationId,
    requiredRoles: result.requiredRoles,
    requiredPermissions: result.requiredPermissions,
    statuses: result.statuses,
  })),
});

const compareSnapshot = (actual) => {
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(
      "Admin access smoke snapshot is missing. Run npm run test:admin-access:update after review.",
    );
  }

  const expected = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(
      "Admin access smoke snapshot changed. Review role/status changes and run npm run test:admin-access:update.",
    );
  }
};

const createSmokeApp = async () => {
  // Patch only this process before AppModule instantiates the global audit
  // interceptor. Access probes must reach guards but must not read or write
  // entity history before the probe interceptor short-circuits the handler.
  const { LogActionInterceptor } = require("../dist/src/logs/log-action.interceptor");
  LogActionInterceptor.prototype.intercept = function intercept(_context, next) {
    return next.handle();
  };

  const { AppModule } = require("../dist/src/app.module");
  const app = await NestFactory.create(AppModule, { logger: ["error"] });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.setGlobalPrefix("api");
  app.useGlobalInterceptors({
    intercept(context, next) {
      const httpRequest = context.switchToHttp().getRequest();
      if (httpRequest.headers["x-admin-access-probe"] !== "1") {
        return next.handle();
      }

      const httpResponse = context.switchToHttp().getResponse();
      httpResponse.status(200).json({ accessProbe: true });
      return of(null);
    },
  });

  // A real ephemeral listener avoids Supertest racing to bind the same lazy
  // in-memory server when the five principal probes run concurrently.
  await app.listen(0, "127.0.0.1");
  return app;
};

const createSwagger = (app) => {
  const config = new DocumentBuilder()
    .setTitle("Trinity Admin API access smoke")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey, methodKey) =>
      `${controllerKey.replace("Controller", "")}_${methodKey}`,
  });
};

const executeProbe = async (app, operation, authorization) => {
  let probe = request(app.getHttpServer())
    [operation.method](operationPath(operation.route))
    .set("Origin", ORIGIN)
    .set("x-admin-access-probe", "1");

  if (authorization) probe = probe.set("Authorization", authorization);
  const response = await probe.timeout({ response: 30000, deadline: 45000 });
  return response.status;
};

const runAccessMatrix = async (app, swagger, tokens) => {
  const operations = collectAdministrativeOperations(swagger);
  const failures = [];
  const results = [];

  const probeOperation = async (operation) => {
    const statuses = {};
    const principals = [
      { name: "anonymous", authorization: undefined, expectedStatus: 401 },
      ...SMOKE_ROLES.map((role) => ({
        name: role,
        authorization: `Bearer ${tokens[role]}`,
        expectedStatus: hasAccess(operation.swaggerOperation, role) ? 200 : 403,
      })),
    ];

    const principalStatuses = await Promise.all(
      principals.map(async (principal) => ({
        ...principal,
        status: await executeProbe(
          app,
          operation,
          principal.authorization,
        ),
      })),
    );

    principalStatuses.forEach((principal) => {
      statuses[principal.name] = principal.status;
      if (principal.status !== principal.expectedStatus) {
        failures.push(
          `${operation.method.toUpperCase()} ${operation.route}: ${principal.name} ` +
            `expected ${principal.expectedStatus}, received ${principal.status}`,
        );
      }
    });

    return { ...operation, statuses };
  };

  for (let offset = 0; offset < operations.length; offset += OPERATION_CONCURRENCY) {
    const chunk = operations.slice(offset, offset + OPERATION_CONCURRENCY);
    results.push(...(await Promise.all(chunk.map(probeOperation))));
    console.log(
      `Access probes: ${Math.min(offset + chunk.length, operations.length)}/${operations.length}`,
    );
  }

  if (failures.length > 0) {
    throw new Error(`Admin access matrix failed:\n${failures.join("\n")}`);
  }

  return results;
};

async function main() {
  const databaseName = createDatabaseName();
  assertSafeDatabaseName(databaseName);

  const serverConnection = await mysql.createConnection(
    databaseConnectionOptions(),
  );
  let app;

  try {
    const [existing] = await serverConnection.query(
      "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?",
      [databaseName],
    );
    if (existing.length > 0) {
      throw new Error(`Refusing to replace existing smoke database: ${databaseName}`);
    }

    await serverConnection.query(
      `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`,
    );
    runMigrations(databaseName);
    const tokens = await seedPrincipals(databaseName);

    process.env.DATABASE_NAME = databaseName;
    process.env.NODE_ENV = "dev";
    app = await createSmokeApp();

    const swagger = createSwagger(app);
    const results = await runAccessMatrix(app, swagger, tokens);
    const snapshot = buildSnapshot(results);

    if (shouldUpdate) {
      fs.writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
      console.log(`Updated ${path.relative(path.resolve(__dirname, ".."), snapshotPath)}`);
    } else {
      compareSnapshot(snapshot);
    }

    console.log(
      `Admin access smoke OK: ${results.length} operations, ` +
        `${SMOKE_ROLES.length} authenticated roles, anonymous 401 coverage.`,
    );
  } finally {
    try {
      if (app) await app.close();
    } finally {
      try {
        await serverConnection.query(
          `DROP DATABASE IF EXISTS \`${databaseName}\``,
        );
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
