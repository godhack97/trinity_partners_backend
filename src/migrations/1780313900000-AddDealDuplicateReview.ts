import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDealDuplicateReview1780313900000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE deals
      ADD COLUMN duplicate_of_deal_id int NULL,
      ADD COLUMN duplicate_review_status enum('pending', 'duplicate', 'not_duplicate') NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE deals
      DROP COLUMN duplicate_review_status,
      DROP COLUMN duplicate_of_deal_id
    `);
  }
}
