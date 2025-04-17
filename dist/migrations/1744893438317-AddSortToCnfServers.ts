import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSortToCnfServers1744893438317 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE cnf_servers ADD sort INT NOT NULL DEFAULT 0`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE cnf_servers DROP COLUMN sort`);
  }
}
