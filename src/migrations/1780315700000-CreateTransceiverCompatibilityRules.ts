import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTransceiverCompatibilityRules1780315700000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cnf_transceiver_compatibility_rules (
        id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        network_connector_type varchar(30) DEFAULT NULL,
        network_speed_gbps float DEFAULT NULL,
        transceiver_connector_type varchar(30) DEFAULT NULL,
        transceiver_speed_gbps float DEFAULT NULL,
        is_allowed tinyint NOT NULL DEFAULT 1,
        note varchar(255) DEFAULT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS cnf_transceiver_compatibility_rules
    `);
  }
}
