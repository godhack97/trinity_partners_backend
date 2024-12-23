import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPhotoUrlToUserInfo1734620066261 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`
            ALTER TABLE users_info
            ADD photo_url varchar(255) COLLATE utf8mb4_bin DEFAULT NULL;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`
            ALTER TABLE users_info
            DROP COLUMN photo_url;
        `)
    }

}
