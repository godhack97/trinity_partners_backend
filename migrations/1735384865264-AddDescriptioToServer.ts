import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDescriptioToServer1735384865264 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`
      ALTER TABLE cnf_servers
      ADD COLUMN description TEXT COLLATE utf8mb4_bin AFTER name;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`
      ALTER TABLE cnf_servers
      DROP COLUMN description;
    `)
  }

}
