import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateTicketsTables1749900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tickets',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'creator_id', type: 'int unsigned', isNullable: false },
          { name: 'type', type: 'enum', enum: ['manager', 'tech_specialist'], isNullable: false },
          { name: 'subject', type: 'varchar', length: '255', isNullable: false },
          { name: 'status', type: 'enum', enum: ['open', 'in_progress', 'closed'], default: "'open'" },
          { name: 'configuration_id', type: 'int', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
        engine: 'InnoDB',
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'tickets',
      new TableForeignKey({
        columnNames: ['creator_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'ticket_messages',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'ticket_id', type: 'int', isNullable: false },
          { name: 'sender_id', type: 'int unsigned', isNullable: false },
          { name: 'message', type: 'text', isNullable: false },
          { name: 'attachments', type: 'json', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
        engine: 'InnoDB',
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'ticket_messages',
      new TableForeignKey({
        columnNames: ['ticket_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tickets',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'ticket_messages',
      new TableForeignKey({
        columnNames: ['sender_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ticket_messages', true);
    await queryRunner.dropTable('tickets', true);
  }
}
