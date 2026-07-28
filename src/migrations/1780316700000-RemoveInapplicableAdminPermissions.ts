import { MigrationInterface, QueryRunner } from "typeorm";

const INAPPLICABLE_PERMISSIONS = [
  "system.admin-employees.remove",
  "system.admin-company-requests.remove",
  "system.admin-logs.write",
  "system.admin-logs.remove",
];

export class RemoveInapplicableAdminPermissions1780316700000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM permissions WHERE name IN (${INAPPLICABLE_PERMISSIONS.map(() => "?").join(", ")})`,
      INAPPLICABLE_PERMISSIONS,
    );
  }

  public async down(): Promise<void> {
    // The removed switches did not protect real operations. Restoring inert
    // permissions would make the admin UI misleading again.
  }
}
