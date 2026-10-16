import { MigrationInterface, QueryRunner } from "typeorm";

const EMPLOYEE_READ_PERMISSION = "api.portal-employees.read";

export class GrantPartnerManagerEmployeeReadAccess1780321600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
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
      [EMPLOYEE_READ_PERMISSION],
    );
  }

  // The permission may be assigned manually or by a later role policy.
  // A rollback cannot safely distinguish ownership, so keep the grant intact.
  public async down(): Promise<void> {}
}
