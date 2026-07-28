import { MigrationInterface, QueryRunner } from "typeorm";
import { PARTNER_PORTAL_PERMISSIONS } from "../access/partner-portal-permissions";

export class AddPartnerPortalPermissions1780316800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const permission of PARTNER_PORTAL_PERMISSIONS) {
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
      await queryRunner.query(
        `UPDATE permissions
         SET description = ?, display_name = ?, resource_type = ?,
             resource_name = ?, action = ?
         WHERE name = ?`,
        [
          permission.description,
          permission.displayName,
          permission.resourceType,
          permission.resourceName,
          permission.action,
          permission.name,
        ],
      );

      for (const roleName of permission.defaultRoles) {
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
          [permission.name, roleName],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const names = PARTNER_PORTAL_PERMISSIONS
      .map(({ name }) => name)
      .filter((name) => name.startsWith("api.portal-"));
    if (!names.length) return;
    const placeholders = names.map(() => "?").join(", ");
    await queryRunner.query(
      `DELETE rp FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE p.name IN (${placeholders})`,
      names,
    );
    await queryRunner.query(
      `DELETE FROM permissions WHERE name IN (${placeholders})`,
      names,
    );
  }
}
