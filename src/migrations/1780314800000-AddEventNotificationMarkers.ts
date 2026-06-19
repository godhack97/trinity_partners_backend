import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEventNotificationMarkers1780314800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE events
      ADD COLUMN notification_sent_at datetime NULL,
      ADD COLUMN reminder_3_days_sent_at datetime NULL,
      ADD COLUMN reminder_1_day_sent_at datetime NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE events
      DROP COLUMN reminder_1_day_sent_at,
      DROP COLUMN reminder_3_days_sent_at,
      DROP COLUMN notification_sent_at
    `);
  }
}
