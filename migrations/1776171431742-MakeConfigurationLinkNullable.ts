import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeConfigurationLinkNullable1776171431742 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE deals
            MODIFY COLUMN configuration_link varchar(255) NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE deals
            MODIFY COLUMN configuration_link varchar(255) NOT NULL;
        `);
    }

}
