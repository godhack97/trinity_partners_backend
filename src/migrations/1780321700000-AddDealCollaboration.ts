import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDealCollaboration1780321700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const deals = await queryRunner.getTable("deals");
    for (const definition of [
      ["distributor_sent_at", "DATETIME NULL"],
      ["distributor_sent_by", "INT UNSIGNED NULL"],
      ["distributor_revoked_at", "DATETIME NULL"],
      ["distributor_revoked_by", "INT UNSIGNED NULL"],
    ] as const) {
      if (!deals?.columns.some((column) => column.name === definition[0])) {
        await queryRunner.query(
          `ALTER TABLE deals ADD COLUMN ${definition[0]} ${definition[1]}`,
        );
      }
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS deal_participants (
        id INT NOT NULL AUTO_INCREMENT,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deal_id INT NOT NULL,
        user_id INT NOT NULL,
        company_id INT NOT NULL,
        party_type ENUM('vendor','partner','distributor') NOT NULL,
        participant_role VARCHAR(64) NULL,
        added_by INT NULL,
        removed_at DATETIME NULL,
        removed_by INT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY UQ_deal_participant_user (deal_id, user_id),
        KEY IDX_deal_participants_company (company_id, is_active),
        CONSTRAINT FK_deal_participants_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS deal_channels (
        id INT NOT NULL AUTO_INCREMENT,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deal_id INT NOT NULL,
        channel_type ENUM('vendor_distributor','vendor_partner','partner_distributor','general') NOT NULL,
        first_company_id INT NULL,
        second_company_id INT NULL,
        archived_at DATETIME NULL,
        PRIMARY KEY (id),
        KEY IDX_deal_channels_deal (deal_id),
        CONSTRAINT FK_deal_channels_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS deal_messages (
        id INT NOT NULL AUTO_INCREMENT,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        channel_id INT NOT NULL,
        author_id INT NOT NULL,
        author_company_id INT NULL,
        text TEXT NOT NULL,
        attachments JSON NULL,
        deleted_at DATETIME NULL,
        PRIMARY KEY (id),
        KEY IDX_deal_messages_channel_created (channel_id, created_at),
        CONSTRAINT FK_deal_messages_channel FOREIGN KEY (channel_id) REFERENCES deal_channels(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS deal_channel_reads (
        id INT NOT NULL AUTO_INCREMENT,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        channel_id INT NOT NULL,
        user_id INT NOT NULL,
        last_read_message_id INT NULL,
        last_read_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY UQ_deal_channel_read_user (channel_id, user_id),
        CONSTRAINT FK_deal_channel_reads_channel FOREIGN KEY (channel_id) REFERENCES deal_channels(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS deal_manager_transfers (
        id INT NOT NULL AUTO_INCREMENT,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deal_id INT NOT NULL,
        previous_manager_id INT NULL,
        new_manager_id INT NOT NULL,
        transferred_by INT NOT NULL,
        reason VARCHAR(500) NULL,
        PRIMARY KEY (id),
        KEY IDX_deal_manager_transfers_deal (deal_id, created_at),
        CONSTRAINT FK_deal_manager_transfers_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO deal_participants
        (deal_id, user_id, company_id, party_type, participant_role, added_by, is_active)
      SELECT id, creator_id, creator_company_id, 'partner', 'creator', creator_id, 1
      FROM deals
      WHERE creator_company_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS deal_manager_transfers");
    await queryRunner.query("DROP TABLE IF EXISTS deal_channel_reads");
    await queryRunner.query("DROP TABLE IF EXISTS deal_messages");
    await queryRunner.query("DROP TABLE IF EXISTS deal_channels");
    await queryRunner.query("DROP TABLE IF EXISTS deal_participants");

    const deals = await queryRunner.getTable("deals");
    for (const columnName of [
      "distributor_revoked_by",
      "distributor_revoked_at",
      "distributor_sent_by",
      "distributor_sent_at",
    ]) {
      if (deals?.columns.some((column) => column.name === columnName)) {
        await queryRunner.query(`ALTER TABLE deals DROP COLUMN ${columnName}`);
      }
    }
  }
}
