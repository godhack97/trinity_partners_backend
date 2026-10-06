import { MigrationInterface, QueryRunner } from "typeorm";
import { ADMIN_USER_IMPERSONATION_PERMISSION } from "../access/admin-user-impersonation";

export class AddAdminUserImpersonationPermission1780321200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        INSERT INTO permissions (
          name, description, display_name, resource_type, resource_name, action
        )
        VALUES (?, ?, ?, 'system', 'admin-users', 'impersonate')
        ON DUPLICATE KEY UPDATE
          description = VALUES(description),
          display_name = VALUES(display_name),
          resource_type = VALUES(resource_type),
          resource_name = VALUES(resource_name),
          action = VALUES(action)
      `,
      [
        ADMIN_USER_IMPERSONATION_PERMISSION,
        "Разрешает просматривать список пользователей и входить в портал от имени любого действующего пользователя. Выдавайте только доверенным администраторам.",
        "Вход от имени пользователя",
      ],
    );

    await queryRunner.query(
      `
        INSERT IGNORE INTO role_permissions (role_id, permission_id)
        SELECT role.id, permission.id
        FROM roles role
        JOIN permissions permission ON permission.name = ?
        WHERE role.name = 'super_admin'
      `,
      [ADMIN_USER_IMPERSONATION_PERMISSION],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "DELETE FROM permissions WHERE name = ?",
      [ADMIN_USER_IMPERSONATION_PERMISSION],
    );
  }
}
