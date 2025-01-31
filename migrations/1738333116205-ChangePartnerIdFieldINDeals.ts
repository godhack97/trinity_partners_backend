import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangePartnerIdFieldINDeals1738333116205 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER Table deals
            CHANGE partner_id creator_id int unsigned not null;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER Table deals
            CHANGE creator_id partner_id int unsigned not null;
        `)
    }

}
