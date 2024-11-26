import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCnfServerGeneration1732574711736 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS cnf_server_generation (
            id varchar(36) COLLATE utf8mb4_bin NOT NULL DEFAULT '(UUID())',
            name   varchar(250) CHARACTER SET utf8mb4 NOT NULL,
            created_at timestamp        NOT NULL       DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp        NOT NULL       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY unique_name (name)
            ) ENGINE = InnoDB
              DEFAULT CHARSET = utf8mb4
              COLLATE = utf8mb4_bin;
            `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS cnf_server_generation
            `);
    }

}
