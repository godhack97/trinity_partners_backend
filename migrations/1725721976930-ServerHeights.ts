import { MigrationInterface, QueryRunner } from "typeorm";
import * as crypto from 'crypto';
import { createUUID } from "../src/utils/password";
export class ServerHeights1725721976930 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`INSERT INTO cnf_serverbox_height(id, name) VALUES ('${createUUID()}','U1');`);
        await queryRunner.query(`INSERT INTO cnf_serverbox_height(id, name) VALUES ('${createUUID()}','U2');`);
        await queryRunner.query(`INSERT INTO cnf_serverbox_height(id, name) VALUES ('${createUUID()}','U3');`);
        await queryRunner.query(`INSERT INTO cnf_serverbox_height(id, name) VALUES ('${createUUID()}','U4');`);
        await queryRunner.query(`INSERT INTO cnf_serverbox_height(id, name) VALUES ('${createUUID()}','U5');`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("SET FOREIGN_KEY_CHECKS = 0;");
        await queryRunner.query(`TRUNCATE cnf_serverbox_height;`);
        await queryRunner.query("SET FOREIGN_KEY_CHECKS = 1;");
    }
}
