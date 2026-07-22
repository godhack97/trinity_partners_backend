import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanyNotificationOutbox1780316300000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("notifications", "delivery_key"))) {
      await queryRunner.query(`
        ALTER TABLE notifications
          ADD COLUMN delivery_key varchar(191) NULL
      `);
    }
    const notificationsTable = await queryRunner.getTable("notifications");
    if (
      !(notificationsTable?.indices || []).some(
        ({ name }) => name === "UQ_notifications_delivery_key",
      )
    ) {
      await queryRunner.query(`
        CREATE UNIQUE INDEX UQ_notifications_delivery_key
          ON notifications (delivery_key)
      `);
    }

    if (!(await queryRunner.hasTable("company_notification_outbox"))) {
      await queryRunner.query(`
        CREATE TABLE company_notification_outbox (
        id int NOT NULL AUTO_INCREMENT,
        company_id int unsigned NOT NULL,
        user_id int unsigned NULL,
        delivery_key varchar(191) NOT NULL,
        channel enum('email', 'site') NOT NULL,
        status enum('pending', 'processing', 'delivered', 'failed')
          NOT NULL DEFAULT 'pending',
        recipient_email varchar(255) NULL,
        payload json NOT NULL,
        attempts int NOT NULL DEFAULT 0,
        available_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        delivered_at timestamp NULL,
        last_error varchar(128) NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE INDEX UQ_company_notification_outbox_delivery_key (delivery_key),
        INDEX IDX_company_notification_outbox_due (status, available_at),
        INDEX IDX_company_notification_outbox_company (company_id),
        CONSTRAINT FK_company_notification_outbox_company
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        CONSTRAINT FK_company_notification_outbox_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE company_notification_outbox");
    await queryRunner.query(`
      ALTER TABLE notifications
        DROP INDEX UQ_notifications_delivery_key,
        DROP COLUMN delivery_key
    `);
  }
}
