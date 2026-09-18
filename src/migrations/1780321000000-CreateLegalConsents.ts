import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLegalConsents1780321000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("legal_consents")) return;

    await queryRunner.query(`
      CREATE TABLE legal_consents (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        user_id int unsigned NULL,
        session_hash varchar(64) NULL,
        policy_type varchar(64) NOT NULL,
        policy_version varchar(64) NOT NULL,
        accepted tinyint(1) NOT NULL DEFAULT 1,
        accepted_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        source varchar(64) NOT NULL,
        ip_hash char(64) NULL,
        user_agent_hash char(64) NULL,
        metadata json NULL,
        PRIMARY KEY (id),
        KEY idx_legal_consents_user_policy (user_id, policy_type, accepted_at),
        KEY idx_legal_consents_session (session_hash),
        CONSTRAINT fk_legal_consents_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      INSERT INTO legal_consents
        (user_id, policy_type, policy_version, accepted, accepted_at, source)
      SELECT id, 'user_agreement', 'legacy', 1,
        COALESCE(legal_accepted_at, created_at, CURRENT_TIMESTAMP),
        COALESCE(legal_accepted_source, 'legacy_backfill')
      FROM users
      WHERE agreement_accepted = 1
    `);
    await queryRunner.query(`
      INSERT INTO legal_consents
        (user_id, policy_type, policy_version, accepted, accepted_at, source)
      SELECT id, 'privacy_152fz', 'legacy', 1,
        COALESCE(legal_accepted_at, created_at, CURRENT_TIMESTAMP),
        COALESCE(legal_accepted_source, 'legacy_backfill')
      FROM users
      WHERE privacy_policy_accepted = 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("legal_consents")) {
      await queryRunner.query("DROP TABLE legal_consents");
    }
  }
}
