import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedCustomers1730125078743 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO customers (first_name, last_name, inn, company_name, email, phone, created_at, updated_at)
             VALUES
              ('Андрей', 'Андреев', '123456789', 'Company1 Inc.', 'andrei@mail.com', '123-456-7890', NOW(), NOW()),
              ('Иван', 'Иванов', '987654321', 'Ivan LLC', 'ivan@mail.com', '098-765-4321', NOW(), NOW()),
              ('Петр', 'Петров', '555555555', 'Petr Co.', 'petr@mail.com', NULL, NOW(), NOW());
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("SET FOREIGN_KEY_CHECKS = 0;");
        await queryRunner.query("TRUNCATE customers;");
        await queryRunner.query("SET FOREIGN_KEY_CHECKS = 1;");
    }

}
