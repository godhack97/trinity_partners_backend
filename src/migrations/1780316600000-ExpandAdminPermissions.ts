import { MigrationInterface, QueryRunner } from "typeorm";
import {
  ADMIN_SECTION_PERMISSIONS,
  GRANULAR_ADMIN_SECTION_PERMISSIONS,
} from "../access/admin-section-permissions";

export class ExpandAdminPermissions1780316600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const permission of GRANULAR_ADMIN_SECTION_PERMISSIONS) {
      await queryRunner.query(
        `
          INSERT INTO permissions (
            name, description, display_name, resource_type, resource_name, action
          )
          VALUES (?, ?, ?, 'system', ?, ?)
          ON DUPLICATE KEY UPDATE
            description = VALUES(description),
            display_name = VALUES(display_name),
            resource_type = VALUES(resource_type),
            resource_name = VALUES(resource_name),
            action = VALUES(action)
        `,
        [
          permission.name,
          permission.description,
          permission.displayName,
          permission.resourceName,
          permission.action,
        ],
      );

      for (const roleName of permission.defaultRoles) {
        await queryRunner.query(
          `
            INSERT IGNORE INTO role_permissions (role_id, permission_id)
            SELECT role.id, permission.id
            FROM roles role
            JOIN permissions permission ON permission.name = ?
            WHERE role.name = ?
          `,
          [permission.name, roleName],
        );
      }
    }

    for (const section of ADMIN_SECTION_PERMISSIONS) {
      await queryRunner.query(
        `
          INSERT IGNORE INTO role_permissions (role_id, permission_id)
          SELECT legacy_assignment.role_id, granular.id
          FROM role_permissions legacy_assignment
          JOIN permissions legacy
            ON legacy.id = legacy_assignment.permission_id
            AND legacy.name = ?
          JOIN permissions granular
            ON granular.name IN (?, ?, ?)
        `,
        [
          section.name,
          section.name.replace(/\.manage$/, ".read"),
          section.name.replace(/\.manage$/, ".write"),
          section.name.replace(/\.manage$/, ".remove"),
        ],
      );
    }

    const legacyNames = ADMIN_SECTION_PERMISSIONS.map(({ name }) => name);
    await queryRunner.query(
      `DELETE FROM permissions WHERE name IN (${legacyNames.map(() => "?").join(", ")})`,
      legacyNames,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const names = GRANULAR_ADMIN_SECTION_PERMISSIONS.map(({ name }) => name);
    if (names.length === 0) return;
    await queryRunner.query(
      `DELETE FROM permissions WHERE name IN (${names.map(() => "?").join(", ")})`,
      names,
    );
  }
}
