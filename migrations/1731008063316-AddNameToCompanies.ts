import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNameToCompanies1731008063316 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('companies');
        const hasNameColumn = table?.findColumnByName('name');

        if (!hasNameColumn) {
           await queryRunner.query(`
              ALTER TABLE companies
              ADD COLUMN name VARCHAR(255) NOT NULL;
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('companies');
        const hasNameColumn = table?.findColumnByName('name');

        if (hasNameColumn) {
           await queryRunner.query(`
           ALTER TABLE companies
           DROP COLUMN name;
           `);
        }
    }
}
