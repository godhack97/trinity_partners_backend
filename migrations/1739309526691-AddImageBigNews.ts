import { MigrationInterface, QueryRunner } from "typeorm";

export class AddImageBigNews1739309526691 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`
        ALTER TABLE news
            ADD COLUMN image_big varchar (255) COLLATE utf8mb4_bin DEFAULT NULL;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`
        ALTER TABLE news
            DROP COLUMN image_big;
    `)
  }

}
