import { MigrationInterface, QueryRunner } from "typeorm";

export class CorrectSpecialDiscountFieldInDealTable1732704790083 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE deals
            MODIFY COLUMN special_discount VARCHAR(255) COMMENT 'размер скидки'
            `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE deals
            MODIFY COLUMN special_discount DOUBLE(10, 2) COMMENT 'размер скидки'
            `);
    }

}
