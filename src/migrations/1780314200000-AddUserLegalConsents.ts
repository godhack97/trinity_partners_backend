import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserLegalConsents1780314200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN agreement_accepted tinyint NOT NULL DEFAULT 0,
      ADD COLUMN privacy_policy_accepted tinyint NOT NULL DEFAULT 0,
      ADD COLUMN legal_accepted_at timestamp NULL,
      ADD COLUMN legal_accepted_source varchar(255) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN legal_accepted_source,
      DROP COLUMN legal_accepted_at,
      DROP COLUMN privacy_policy_accepted,
      DROP COLUMN agreement_accepted
    `);
  }
}
