import { MigrationInterface, QueryRunner } from "typeorm";

export class AddServerGispPageUrlColumn1743106961546 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`
            ALTER TABLE cnf_servers
            ADD gisp varchar(255) COLLATE utf8mb4_bin DEFAULT NULL;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`
            ALTER TABLE cnf_servers
            DROP COLUMN gisp;
        `)
    }

}