import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIconFieldToNotifications1738653156106 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`
            ALTER TABLE notifications
            ADD COLUMN icon ENUM('bell', 'horn', 'shield') NOT NULL DEFAULT 'bell';
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
