import { MigrationInterface, QueryRunner } from "typeorm";

export class AddConfiguratorDraftSharedBy1780315000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE configurator_drafts
      ADD COLUMN shared_by_id int NULL,
      ADD COLUMN deal_id int NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE configurator_drafts
      DROP COLUMN deal_id,
      DROP COLUMN shared_by_id
    `);
  }
}
