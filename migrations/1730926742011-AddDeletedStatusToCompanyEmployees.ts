import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeletedStatusToCompanyEmployees1730926742011 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE company_employees MODIFY status ENUM('pending', 'accept', 'reject', 'deleted') DEFAULT 'pending';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE company_employees MODIFY status ENUM('pending', 'accept', 'reject') DEFAULT 'pending';
        `);
    }
}
