import { MigrationInterface, QueryRunner } from "typeorm";

const ROLE_DEFINITIONS = [
  ["company_admin", "Администратор компании"],
  ["sales_manager", "Менеджер по продажам"],
  ["technical_specialist", "Технический специалист"],
  ["staff", "Сотрудник без доступа к сделкам и конфигурациям"],
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  company_admin: [
    "api.companies.read",
    "api.companies.write",
    "api.configurator.read",
    "api.configurator.write",
    "api.deals.read",
    "api.deals.write",
    "api.deals.remove",
    "api.distributors.read",
    "api.profile.read",
    "api.profile.write",
    "api.upload.write",
    "menu.dashboard.read",
    "menu.deals.read",
    "menu.configurator.read",
    "menu.profile.read",
  ],
  sales_manager: [
    "api.configurator.read",
    "api.configurator.write",
    "api.deals.read",
    "api.deals.write",
    "api.distributors.read",
    "api.profile.read",
    "api.profile.write",
    "api.upload.write",
    "menu.dashboard.read",
    "menu.deals.read",
    "menu.configurator.read",
    "menu.profile.read",
  ],
  technical_specialist: [
    "api.configurator.read",
    "api.configurator.write",
    "api.deals.read",
    "api.deals.write",
    "api.distributors.read",
    "api.profile.read",
    "api.profile.write",
    "api.upload.write",
    "menu.dashboard.read",
    "menu.deals.read",
    "menu.configurator.read",
    "menu.profile.read",
  ],
  staff: [
    "api.profile.read",
    "api.profile.write",
    "menu.dashboard.read",
    "menu.profile.read",
    "menu.news.read",
  ],
};

export class AddBusinessRoles1780000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [name, description] of ROLE_DEFINITIONS) {
      await queryRunner.query(
        `
          INSERT INTO roles (name, description)
          SELECT ?, ?
          WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = ?)
        `,
        [name, description, name],
      );
    }

    for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
      for (const permissionName of permissionNames) {
        await queryRunner.query(
          `
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM roles r
            JOIN permissions p ON p.name = ?
            WHERE r.name = ?
              AND NOT EXISTS (
                SELECT 1 FROM role_permissions rp
                WHERE rp.role_id = r.id AND rp.permission_id = p.id
              )
          `,
          [permissionName, roleName],
        );
      }
    }

    await queryRunner.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT u.id, r.id
      FROM users u
      JOIN roles cr ON cr.id = u.role_id
      JOIN roles r ON r.name = 'company_admin'
      WHERE cr.name IN ('partner', 'employee_admin')
        AND NOT EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = u.id AND ur.role_id = r.id
        )
    `);

    await queryRunner.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT u.id, r.id
      FROM users u
      JOIN roles cr ON cr.id = u.role_id
      JOIN roles r ON r.name = 'sales_manager'
      WHERE cr.name = 'employee'
        AND NOT EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = u.id AND ur.role_id = r.id
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE ur FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE r.name IN ('company_admin', 'sales_manager', 'technical_specialist', 'staff')
    `);

    await queryRunner.query(`
      DELETE rp FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      WHERE r.name IN ('company_admin', 'sales_manager', 'technical_specialist', 'staff')
    `);

    await queryRunner.query(`
      DELETE FROM roles
      WHERE name IN ('company_admin', 'sales_manager', 'technical_specialist', 'staff')
    `);
  }
}
