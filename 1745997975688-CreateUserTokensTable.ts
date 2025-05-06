import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateUserTokensTable1745997975688 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'user_tokens',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment', unsigned: true },
        { name: 'user_id', type: 'int', isNullable: false, unsigned: true },
        { name: 'client_id', type: 'varchar', length: '100', isNullable: false },
        { name: 'token', type: 'varchar', length: '255', isNullable: false },
        { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', isNullable: true },
      ],
    }), true);

    await queryRunner.createForeignKey('user_tokens', new TableForeignKey({
      columnNames: ['user_id'],
      referencedTableName: 'users',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
    }));

    await queryRunner.createIndex('user_tokens', new TableIndex({
      name: 'uniq_user_client',
      columnNames: ['user_id', 'client_id'],
      isUnique: true,
    }));

    await queryRunner.query(`
      INSERT INTO user_tokens (user_id, client_id, token)
      SELECT id, 'default', token
      FROM users
      WHERE token IS NOT NULL AND token != ''
    `);

    await queryRunner.query(`ALTER TABLE users DROP COLUMN token`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN token varchar(255) DEFAULT NULL`);
    await queryRunner.query(`
      UPDATE users u
      JOIN user_tokens ut ON ut.user_id = u.id AND ut.client_id = 'default'
      SET u.token = ut.token
    `);
    await queryRunner.dropTable('user_tokens');
  }
}
