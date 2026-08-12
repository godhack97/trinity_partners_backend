import { MigrationInterface, QueryRunner } from "typeorm";

const DEAL_PERMISSION_NAMES = ["api.deals.read", "api.deals.write"];
const PORTAL_COMPANY_PERMISSION = "api.portal-companies.read";
const ADMIN_DEAL_PERMISSION_NAMES = [
  "system.admin-deals.read",
  "system.admin-deals.write",
];

export class GrantPartnerManagerDealPortalAccess1780317400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const permissionName of DEAL_PERMISSION_NAMES) {
      await queryRunner.query(
        `
          INSERT INTO role_permissions (role_id, permission_id)
          SELECT role.id, permission.id
          FROM roles role
          INNER JOIN permissions permission ON permission.name = ?
          WHERE role.name = 'partner_manager'
            AND NOT EXISTS (
              SELECT 1
              FROM role_permissions existing
              WHERE existing.role_id = role.id
                AND existing.permission_id = permission.id
            )
        `,
        [permissionName],
      );
    }
    for (const permissionName of ADMIN_DEAL_PERMISSION_NAMES) {
      await queryRunner.query(
        `
          INSERT INTO role_permissions (role_id, permission_id)
          SELECT role.id, permission.id
          FROM roles role
          INNER JOIN permissions permission ON permission.name = ?
          WHERE role.name = 'partner_manager'
            AND NOT EXISTS (
              SELECT 1
              FROM role_permissions existing
              WHERE existing.role_id = role.id
                AND existing.permission_id = permission.id
            )
        `,
        [permissionName],
      );
    }

    for (const roleName of [
      "company_admin",
      "sales_manager",
      "partner_manager",
    ]) {
      await queryRunner.query(
        `
          INSERT INTO role_permissions (role_id, permission_id)
          SELECT role.id, permission.id
          FROM roles role
          INNER JOIN permissions permission ON permission.name = ?
          WHERE role.name = ?
            AND NOT EXISTS (
              SELECT 1
              FROM role_permissions existing
              WHERE existing.role_id = role.id
                AND existing.permission_id = permission.id
            )
        `,
        [PORTAL_COMPANY_PERMISSION, roleName],
      );
    }
  }

  // Grants may have existed before this migration or may be assigned manually.
  // A destructive rollback cannot distinguish ownership, so keep them intact.
  public async down(): Promise<void> {}
}
