import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsReadToTicketMessages1749900500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'ticket_messages',
      new TableColumn({
        name: 'is_read',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('ticket_messages', 'is_read');
  }
}
