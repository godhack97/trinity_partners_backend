import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSmtpSettings1780320800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE smtp_settings (
        id tinyint unsigned NOT NULL,
        host varchar(255) NOT NULL,
        port int unsigned NOT NULL,
        secure tinyint NOT NULL DEFAULT 0,
        username varchar(255) NOT NULL,
        password_encrypted text NOT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE smtp_settings");
  }
}
