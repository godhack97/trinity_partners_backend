import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanyPartnerLevelAndCertExpiry1776173410677 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE companies
            ADD COLUMN partner_level ENUM('bronze','silver','gold','platinum') NULL COMMENT 'Уровень партнёра';
        `);
        await queryRunner.query(`
            ALTER TABLE companies
            ADD COLUMN certificate_expiry DATE NULL COMMENT 'Срок действия сертификата';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE companies DROP COLUMN certificate_expiry;`);
        await queryRunner.query(`ALTER TABLE companies DROP COLUMN partner_level;`);
    }

}
