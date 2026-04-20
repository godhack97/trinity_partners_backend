import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateImportantAlertsTable1749800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'important_alerts',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'title', type: 'varchar', length: '255', isNullable: false },
          { name: 'message', type: 'text', isNullable: false },
          { name: 'severity', type: 'enum', enum: ['critical', 'warning', 'info'], default: "'info'" },
          { name: 'is_active', type: 'tinyint', default: 1 },
          { name: 'author_id', type: 'int', isNullable: false },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
        engine: 'InnoDB',
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('important_alerts', true);
  }
}
