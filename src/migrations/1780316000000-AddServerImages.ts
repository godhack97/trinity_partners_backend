import { MigrationInterface, QueryRunner } from "typeorm";

export class AddServerImages1780316000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("cnf_servers", "images"))) {
      await queryRunner.query(`
        ALTER TABLE cnf_servers
        ADD COLUMN images json NULL AFTER image
      `);
    }

    await queryRunner.query(`
      UPDATE cnf_servers
      SET images = JSON_ARRAY(image)
      WHERE image IS NOT NULL
        AND TRIM(image) <> ''
        AND (images IS NULL OR JSON_LENGTH(images) = 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("cnf_servers", "images")) {
      await queryRunner.query(`
        ALTER TABLE cnf_servers
        DROP COLUMN images
      `);
    }
  }
}
