import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMissingTables1776175200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS configurator_drafts (
        id int unsigned NOT NULL AUTO_INCREMENT,
        creator_id int unsigned NOT NULL,
        title varchar(255) NOT NULL,
        server_id varchar(36) DEFAULT NULL,
        serverbox_height_id varchar(36) DEFAULT NULL,
        components json DEFAULT NULL,
        total_price decimal(12,2) NOT NULL DEFAULT 0.00,
        description text DEFAULT NULL,
        deleted_at datetime(6) DEFAULT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY FK_cd_creator (creator_id),
        CONSTRAINT FK_cd_creator FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id int NOT NULL AUTO_INCREMENT,
        ticket_id int NOT NULL,
        sender_id int unsigned NOT NULL,
        message text NOT NULL,
        attachments json DEFAULT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY FK_tm_ticket (ticket_id),
        KEY FK_tm_sender (sender_id),
        CONSTRAINT FK_tm_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
        CONSTRAINT FK_tm_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS events (
        id int NOT NULL AUTO_INCREMENT,
        title varchar(255) NOT NULL,
        description text DEFAULT NULL,
        date datetime NOT NULL,
        end_date datetime DEFAULT NULL,
        link varchar(500) DEFAULT NULL,
        type enum('webinar','conference','training','other') NOT NULL DEFAULT 'webinar',
        image varchar(500) DEFAULT NULL,
        is_active tinyint NOT NULL DEFAULT 1,
        deleted_at datetime(6) DEFAULT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS recommended_configs (
        id int NOT NULL AUTO_INCREMENT,
        category varchar(50) NOT NULL,
        category_label varchar(100) NOT NULL,
        server_id varchar(255) DEFAULT NULL,
        server_name varchar(255) DEFAULT NULL,
        description text DEFAULT NULL,
        components json DEFAULT NULL,
        image varchar(500) DEFAULT NULL,
        is_active tinyint NOT NULL DEFAULT 1,
        deleted_at datetime(6) DEFAULT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ticket_messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS configurator_drafts`);
    await queryRunner.query(`DROP TABLE IF EXISTS events`);
    await queryRunner.query(`DROP TABLE IF EXISTS recommended_configs`);
  }
}
