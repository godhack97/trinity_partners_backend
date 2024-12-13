import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeletedAtToDistributors1734116960375 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
           ALTER TABLE distributors
           ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
           ALTER TABLE distributors
           DROP COLUMN deleted_at;
        `);
    }

}
