import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddComponentGenerationFields1733013297459 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        
        await queryRunner.addColumn("cnf_components", new TableColumn({
            
            name: "server_generation_id",
            type: "varchar",
            isNullable: true,
            default: null,
            
        }));

        await queryRunner.addColumn("cnf_components", new TableColumn({
            
            name: "processor_generation_id",
            type: "varchar",
            isNullable: true,
            default: null,
            
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        
        await queryRunner.dropColumn("cnf_components", "server_generation_id");
        await queryRunner.dropColumn("cnf_components", "processor_generation_id");
        
    }

}