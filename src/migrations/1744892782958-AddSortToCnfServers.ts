import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSortToCnfServers implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE cnf_servers ADD sort INT NOT NULL DEFAULT 100`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE cnf_servers DROP COLUMN sort`);
  }
}