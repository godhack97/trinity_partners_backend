import { MigrationInterface, QueryRunner } from "typeorm";

export class NormalizeEmployeeBusinessRoles1780000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE employee_role FROM user_roles employee_role
      JOIN roles employee ON employee.id = employee_role.role_id
      JOIN (
        SELECT user_id
        FROM (
          SELECT DISTINCT business_role.user_id
          FROM user_roles business_role
          JOIN roles business ON business.id = business_role.role_id
          WHERE business.name IN ('sales_manager', 'technical_specialist', 'staff')
        ) business_users
      ) users_with_business_role ON users_with_business_role.user_id = employee_role.user_id
      WHERE employee.name = 'employee'
    `);
  }

  public async down(): Promise<void> {
    return;
  }
}
