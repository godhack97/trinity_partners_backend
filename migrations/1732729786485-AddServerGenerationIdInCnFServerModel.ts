import { MigrationInterface, QueryRunner } from "typeorm";

export class AddServerGenerationIdInCnFServerModel1732729786485 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE cnf_servers
            ADD COLUMN server_generation_id VARCHAR(36) NULL;
            `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE cnf_servers
            DROP COLUMN server_generation_id;
            `);
    }

}
