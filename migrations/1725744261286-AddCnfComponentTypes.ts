import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCnfComponentTypes1725744261286 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          `INSERT INTO cnf_component_types (id, name)
            VALUES
                ('cpu-type-id', 'CPU'),
                ('ram-type-id', 'RAM'),
                ('gpu-type-id', 'GPU'),
                ('memory-type-id', 'MEMORY'),
                ('raid-controller-type-id', 'RAID'),
                ('network-card-type-id', 'NETWORK_CARD'),
                ('other-controllers-type-id', 'OTHER_CONTROLLERS'),
                ('other-components-type-id', 'OTHER_COMPONENTS'),
                ('os-type-id', 'OS'),
                ('av-type-id', 'ANTIVIRUS'),
                ('onec-type-id', 'OneC'),
                ('warranty-type-id', 'WARRANTY'); `
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("SET FOREIGN_KEY_CHECKS = 0;");
        await queryRunner.query(`TRUNCATE cnf_component_types;`);
        await queryRunner.query("SET FOREIGN_KEY_CHECKS = 1;");
    }
}
