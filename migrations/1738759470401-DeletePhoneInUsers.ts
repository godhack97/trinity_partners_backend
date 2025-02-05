import { MigrationInterface, QueryRunner } from "typeorm";

export class DeletePhoneInUsers1738759470401 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`
            ALTER TABLE users
            DROP COLUMN phone
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`
            ALTER TABLE users
            ADD COLUMN phone VARCHAR(255) COLLATE utf8mb4_bin;
        `)
    }

}
