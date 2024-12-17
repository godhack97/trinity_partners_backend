import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueForEmailToUsers1734445194308 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`
            ALTER TABLE users
            ADD UNIQUE (email);
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`
            ALTER TABLE users
            DROP Index email;
        `)
    }
}
