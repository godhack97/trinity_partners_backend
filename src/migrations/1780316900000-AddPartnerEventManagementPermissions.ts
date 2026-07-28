import { MigrationInterface, QueryRunner } from "typeorm";
import { PARTNER_PORTAL_PERMISSIONS } from "../access/partner-portal-permissions";

export class AddPartnerEventManagementPermissions1780316900000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const permissions = PARTNER_PORTAL_PERMISSIONS.filter(
      ({ resourceName, action }) =>
        resourceName === "portal-events" && action !== "read",
    );
    for (const permission of permissions) {
      await queryRunner.query(
        `
          INSERT INTO permissions
            (name, description, display_name, resource_type, resource_name, action)
          SELECT ?, ?, ?, ?, ?, ?
          WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = ?)
        `,
        [
          permission.name,
          permission.description,
          permission.displayName,
          permission.resourceType,
          permission.resourceName,
          permission.action,
          permission.name,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE rp FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE p.name IN ('api.portal-events.write', 'api.portal-events.remove')`,
    );
    await queryRunner.query(
      `DELETE FROM permissions
       WHERE name IN ('api.portal-events.write', 'api.portal-events.remove')`,
    );
  }
}
