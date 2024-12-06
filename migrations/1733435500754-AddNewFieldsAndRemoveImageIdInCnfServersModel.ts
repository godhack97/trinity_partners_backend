import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldsAndRemoveImageIdInCnfServersModel1733435500754 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE cnf_servers
                DROP COLUMN image_id,
                ADD COLUMN image VARCHAR(255) CHARACTER SET utf8mb4 DEFAULT NULL,
                ADD COLUMN guide VARCHAR(255) CHARACTER SET utf8mb4 DEFAULT NULL,
                ADD COLUMN cert VARCHAR(255) CHARACTER SET utf8mb4 DEFAULT NULL;
            `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE cnf_servers
                ADD COLUMN image_id int(11) unsigned  DEFAULT NULL, 
                DROP COLUMN image,
                DROP COLUMN guide,
                DROP COLUMN cert;
           `);
    }

}
