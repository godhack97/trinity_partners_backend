import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateDocumentsTables1748000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // document_groups
    await queryRunner.createTable(
      new Table({
        name: 'document_groups',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', length: '255', isNullable: false },
          { name: 'sort_order', type: 'int', default: 0 },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
        engine: 'InnoDB',
      }),
      true,
    );

    // document_tags
    await queryRunner.createTable(
      new Table({
        name: 'document_tags',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', length: '255', isNullable: false },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
        engine: 'InnoDB',
      }),
      true,
    );

    // document_access_levels
    await queryRunner.createTable(
      new Table({
        name: 'document_access_levels',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', length: '255', isNullable: false },
          { name: 'role_id', type: 'int unsigned', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
        engine: 'InnoDB',
      }),
      true,
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

    // documents
    await queryRunner.createTable(
      new Table({
        name: 'documents',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', length: '255', isNullable: false },
          { name: 'group_id', type: 'int', isNullable: true },
          { name: 'access_level_id', type: 'int', isNullable: true },
          { name: 'file_path', type: 'varchar', length: '500', isNullable: false },
          { name: 'uploaded_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
        engine: 'InnoDB',
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'documents',
      new TableForeignKey({
        name: 'FK_documents_group_id',
        columnNames: ['group_id'],
        referencedTableName: 'document_groups',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'documents',
      new TableForeignKey({
        name: 'FK_documents_access_level_id',
        columnNames: ['access_level_id'],
        referencedTableName: 'document_access_levels',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    // document_tag_relations (ManyToMany junction)
    await queryRunner.createTable(
      new Table({
        name: 'document_tag_relations',
        columns: [
          { name: 'document_id', type: 'int', isNullable: false },
          { name: 'tag_id', type: 'int', isNullable: false },
        ],
        indices: [
          { columnNames: ['document_id', 'tag_id'], isUnique: true },
        ],
        engine: 'InnoDB',
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'document_tag_relations',
      new TableForeignKey({
        name: 'FK_doc_tag_rel_document_id',
        columnNames: ['document_id'],
        referencedTableName: 'documents',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'document_tag_relations',
      new TableForeignKey({
        name: 'FK_doc_tag_rel_tag_id',
        columnNames: ['tag_id'],
        referencedTableName: 'document_tags',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('document_tag_relations', true);
    await queryRunner.dropTable('documents', true);
    await queryRunner.dropTable('document_access_levels', true);
    await queryRunner.dropTable('document_tags', true);
    await queryRunner.dropTable('document_groups', true);
  }
}
