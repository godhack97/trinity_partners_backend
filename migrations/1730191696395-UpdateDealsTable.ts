import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class UpdateDealsTable1730191696395 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
       
        const table = await queryRunner.getTable('deals');
 
       const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('configuration_id') !== -1);
       if (foreignKey) {
          await queryRunner.dropForeignKey('deals', foreignKey);
       }

       const companyKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('company_id') !== -1);
       if (companyKey) {
          await queryRunner.dropForeignKey('deals', companyKey);
       }

        await queryRunner.dropColumn('deals', 'configuration_id');

        await queryRunner.dropColumn('deals', 'company_id');

        await queryRunner.addColumn('deals', new TableColumn({
            name: 'configuration_link',
            type: 'varchar',
            isNullable: false,
        }));

        await queryRunner.addColumn('deals', new TableColumn({
            name: 'partner_id',
            type: 'int',
            unsigned: true,
            isNullable: false,
        }));

        await queryRunner.createForeignKey('deals', new TableForeignKey({
            columnNames: ['partner_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
        }));
            

        await queryRunner.addColumn('deals', new TableColumn({
            name: 'deal_num',
            type: 'varchar',
            isNullable: false,
        }));

        await queryRunner.addColumn('deals', new TableColumn({
            name: 'title',
            type: 'varchar',
            isNullable: true,
        }));

        await queryRunner.addColumn('deals', new TableColumn({
           name: 'created_at',
           type: 'timestamp',
           default: 'CURRENT_TIMESTAMP',
        }));
    
       await queryRunner.addColumn('deals', new TableColumn({
           name: 'updated_at',
           type: 'timestamp',
           default: 'CURRENT_TIMESTAMP',
           onUpdate: 'CURRENT_TIMESTAMP',
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

        const table = await queryRunner.getTable('deals');

        const partnerKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('partner_id') !== -1);
        if (partnerKey) {
          await queryRunner.dropForeignKey('deals', partnerKey);
        }

        await queryRunner.dropColumn('deals', 'partner_id');
        await queryRunner.dropColumn('deals', 'deal_num');
        await queryRunner.dropColumn('deals', 'title');
        await queryRunner.dropColumn('deals', 'updated_at');
        await queryRunner.dropColumn('deals', 'created_at');
        await queryRunner.dropColumn('deals', 'configuration_link');
        await queryRunner.addColumn('deals', new TableColumn({
            name: 'configuration_id',
            type: 'int',
            unsigned: true,
            isNullable: false,
        }));   
        await queryRunner.createForeignKey('deals', new TableForeignKey({
            columnNames: ['configuration_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'configurations',
        }));

        await queryRunner.addColumn('deals', new TableColumn({
            name: 'company_id',
            type: 'int',
            unsigned: true,
            isNullable: false,
        }));

        await queryRunner.createForeignKey('deals', new TableForeignKey({
            columnNames: ['company_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'companies',
        }));
    }
}