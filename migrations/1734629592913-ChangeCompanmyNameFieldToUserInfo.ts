import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeCompanmyNameFieldToUserInfo1734629592913 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`
            ALTER TABLE users_info
            MODIFY company_name TEXT COLLATE utf8mb4_bin DEFAULT NULL;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`
            ALTER TABLE users_info
            MODIFY company_name TEXT COLLATE utf8mb4_bin NOT NULL;
        `)
    }

}
