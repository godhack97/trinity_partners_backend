import { MigrationInterface, QueryRunner } from "typeorm";
import { ADMIN_SECTION_PERMISSIONS } from "../access/admin-section-permissions";

export class ActualizeAdminPermissions1780316500000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const definition of ADMIN_SECTION_PERMISSIONS) {
      await queryRunner.query(
        `
          INSERT INTO permissions (
            name, description, display_name, resource_type, resource_name, action
          )
          VALUES (?, ?, ?, 'system', ?, 'manage')
          ON DUPLICATE KEY UPDATE
            description = VALUES(description),
            display_name = VALUES(display_name),
            resource_type = VALUES(resource_type),
            resource_name = VALUES(resource_name),
            action = VALUES(action)
        `,
        [
          definition.name,
          definition.description,
          definition.displayName,
          definition.name.replace(/^system\./, "").replace(/\.manage$/, ""),
        ],
      );

      for (const roleName of definition.defaultRoles) {
        await queryRunner.query(
          `
            INSERT IGNORE INTO role_permissions (role_id, permission_id)
            SELECT role.id, permission.id
            FROM roles role
            JOIN permissions permission ON permission.name = ?
            WHERE role.name = ?
          `,
          [definition.name, roleName],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const names = ADMIN_SECTION_PERMISSIONS.map(({ name }) => name);
    if (names.length === 0) return;
    const placeholders = names.map(() => "?").join(", ");
    await queryRunner.query(
      `DELETE FROM permissions WHERE name IN (${placeholders})`,
      names,
    );
  }
}
