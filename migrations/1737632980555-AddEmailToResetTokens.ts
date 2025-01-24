import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailToResetTokens1737632980555 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE reset_tokens
            ADD COLUMN email VARCHAR(255) COLLATE utf8mb4_bin NOT NULL AFTER user_id,
            CHANGE token hash VARCHAR(255) COLLATE utf8mb4_bin;
        `)

        await queryRunner.query(`
            ALTER TABLE reset_tokens RENAME TO reset_hashs;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
