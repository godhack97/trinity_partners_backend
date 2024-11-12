import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class MakeCompanyIdNullableInCompanyEmployees1625200450398 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.changeColumn(
            "company_employees",
            "company_id",
            new TableColumn({
                name: "company_id",
                type: "int",
                isNullable: true, // делаем столбец nullable
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.changeColumn(
            "company_employees",
            "company_id",
            new TableColumn({
                name: "company_id",
                type: "int",
                isNullable: false, // возвращаем столбец к состоянию non-nullable
            })
        );
    }
}