import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLoginAttemptLockout1780313800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN failed_login_attempts int NOT NULL DEFAULT 0,
      ADD COLUMN login_blocked_until timestamp NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN login_blocked_until,
      DROP COLUMN failed_login_attempts
    `);
  }
}
