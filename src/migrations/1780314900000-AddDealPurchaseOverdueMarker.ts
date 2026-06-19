import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDealPurchaseOverdueMarker1780314900000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE deals
      ADD COLUMN purchase_overdue_notified_at datetime NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE deals
      DROP COLUMN purchase_overdue_notified_at
    `);
  }
}
