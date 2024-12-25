import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsReadToNotifications1735151050356 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE notifications
            ADD is_read BOOLEAN NOT NULL DEFAULT 0;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
