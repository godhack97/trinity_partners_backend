#!/usr/bin/env node

require("dotenv").config({ path: ".env" });
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/src/app.module");
const {
  CompanyManagementService,
} = require("../dist/src/api/admin/company-management/company-management.service");
const {
  CompanyNotificationOutboxService,
} = require("../dist/src/api/admin/company-management/company-notification-outbox.service");

const actor = (id, role) => ({ id, role: { name: role }, roles: [] });

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  try {
    const companies = app.get(CompanyManagementService);
    const outbox = app.get(CompanyNotificationOutboxService);
    const admin = actor(0, "super_admin");
    const technician = actor(0, "technical_specialist");
    const adminList = await companies.list(
      { current_page: 1, limit: 3 },
      admin,
    );
    const technicianList = await companies.list(
      { current_page: 1, limit: 1 },
      technician,
    );
    const managers = await companies.managerOptions();
    const firstCompany = adminList.data[0];
    const detail = firstCompany
      ? await companies.detail(firstCompany.id, admin)
      : null;
    const outboxSummary = await outbox.summary();

    console.log(
      JSON.stringify({
        admin_visible_total: adminList.meta.visible_total,
        technician_visible_total: technicianList.meta.visible_total,
        first_page_statuses: adminList.data.map(({ status }) => status),
        managers_count: managers.length,
        detail_loaded: Boolean(detail?.id),
        outbox: outboxSummary,
      }),
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
