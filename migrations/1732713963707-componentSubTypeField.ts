import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class ComponentSubTypeField1732713963707 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn("cnf_components", new TableColumn({
            name: "subtype",
            type: "varchar",
            isNullable: true,
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("cnf_components", "subtype");
    }

}