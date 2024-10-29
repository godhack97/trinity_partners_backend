import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedDistributors1730123547851 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO distributors (name, created_at, updated_at) 
            VALUES
              ('Distributor 1', NOW(), NOW()),
              ('Distributor 2', NOW(), NOW()),
              ('Distributor 3', NOW(), NOW()),
              ('Distributor 4', NOW(), NOW()),
              ('Distributor 5', NOW(), NOW());
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("SET FOREIGN_KEY_CHECKS = 0;");
        await queryRunner.query("TRUNCATE distributors;");
        await queryRunner.query("SET FOREIGN_KEY_CHECKS = 1;");
    }

}
