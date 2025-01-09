import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFieldsToNews1736425117675 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE news 
            MODIFY deleted_at TIMESTAMP NULL DEFAULT NULL;
        `)

        const table = await queryRunner.getTable('news');

        const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('image_id') !== -1);
        if (foreignKey) {
            await queryRunner.dropForeignKey('news', foreignKey);
        }

        await queryRunner.query(`
            ALTER TABLE news
            CHANGE title name varchar(255) COLLATE utf8mb4_bin NOT NULL,
            CHANGE description content text COLLATE utf8mb4_bin NOT NULL,
            CHANGE image_id photo varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
            ADD COLUMN url varchar(255) COLLATE utf8mb4_bin DEFAULT NULL AFTER photo,
            ADD COLUMN author_id INT unsigned NOT NULL AFTER photo;
        `)
        await queryRunner.query(`ALTER TABLE news
            ADD FOREIGN KEY (author_id) REFERENCES users (id);`);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
