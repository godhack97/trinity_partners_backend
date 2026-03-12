import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AccessLevelMultipleRoles1748000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create junction table for access level ↔ roles (many-to-many)
    await queryRunner.createTable(
      new Table({
        name: 'document_access_level_roles',
        columns: [
          { name: 'access_level_id', type: 'int', isNullable: false },
          { name: 'role_id', type: 'int unsigned', isNullable: false },
        ],
        indices: [
          { columnNames: ['access_level_id', 'role_id'], isUnique: true },
        ],
        engine: 'InnoDB',
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'document_access_level_roles',
      new TableForeignKey({
        name: 'FK_dal_roles_access_level_id',
        columnNames: ['access_level_id'],
        referencedTableName: 'document_access_levels',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'document_access_level_roles',
      new TableForeignKey({
        name: 'FK_dal_roles_role_id',
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Migrate existing role_id data into junction table
    await queryRunner.query(`
      INSERT INTO document_access_level_roles (access_level_id, role_id)
      SELECT id, role_id FROM document_access_levels WHERE role_id IS NOT NULL
    `);

    // Drop old FK and column
    await queryRunner.dropForeignKey('document_access_levels', 'FK_document_access_levels_role_id');
    await queryRunner.dropColumn('document_access_levels', 'role_id');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add role_id column (restores only one role per level — last one wins)
    await queryRunner.query(
      `ALTER TABLE document_access_levels ADD COLUMN role_id INT UNSIGNED NULL`,
    );
    await queryRunner.createForeignKey(
      'document_access_levels',
      new TableForeignKey({
        name: 'FK_document_access_levels_role_id',
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );
    // Restore one role per level (arbitrary: take min role_id)
    await queryRunner.query(`
      UPDATE document_access_levels dal
      JOIN (
        SELECT access_level_id, MIN(role_id) AS role_id
        FROM document_access_level_roles GROUP BY access_level_id
      ) src ON dal.id = src.access_level_id
      SET dal.role_id = src.role_id
    `);
    await queryRunner.dropTable('document_access_level_roles', true);
  }
}
