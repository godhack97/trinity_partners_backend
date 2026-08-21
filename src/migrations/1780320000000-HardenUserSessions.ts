import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from "typeorm";

export class HardenUserSessions1780320000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("user_tokens"))) return;

    if (!(await queryRunner.hasColumn("user_tokens", "expires_at"))) {
      await queryRunner.addColumn(
        "user_tokens",
        new TableColumn({
          name: "expires_at",
          type: "timestamp",
          isNullable: true,
        }),
      );
    }

    if (!(await queryRunner.hasColumn("user_tokens", "revoked_at"))) {
      await queryRunner.addColumn(
        "user_tokens",
        new TableColumn({
          name: "revoked_at",
          type: "timestamp",
          isNullable: true,
        }),
      );
    }

    const initialTable = await queryRunner.getTable("user_tokens");
    const uniqueUserClientIndex = initialTable?.indices.find(
      (index) => index.name === "uniq_user_client",
    );
    if (uniqueUserClientIndex) {
      await queryRunner.dropIndex("user_tokens", uniqueUserClientIndex);
    }

    await queryRunner.query(`
      UPDATE user_tokens
      SET client_id = CASE
        WHEN LOWER(client_id) = 'web:admin'
          OR LOWER(client_id) LIKE '%admin%'
          OR client_id LIKE '%:9135'
        THEN 'web:admin'
        ELSE 'web:portal'
      END
    `);

    await queryRunner.query(`
      DELETE older
      FROM user_tokens older
      INNER JOIN user_tokens newer
        ON newer.user_id = older.user_id
        AND newer.client_id = older.client_id
        AND newer.id > older.id
    `);

    await queryRunner.query(`
      UPDATE user_tokens
      SET token = CASE
        WHEN token REGEXP '^[0-9a-fA-F]{64}$' THEN LOWER(token)
        ELSE SHA2(token, 256)
      END
    `);

    await queryRunner.query(`
      UPDATE user_tokens
      SET expires_at = DATE_ADD(COALESCE(created_at, CURRENT_TIMESTAMP), INTERVAL 30 DAY)
      WHERE expires_at IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE user_tokens
      MODIFY COLUMN expires_at TIMESTAMP NOT NULL
    `);

    const migratedTable = await queryRunner.getTable("user_tokens");
    if (
      !migratedTable?.indices.some(
        (index) => index.name === "uniq_user_client",
      )
    ) {
      await queryRunner.createIndex(
        "user_tokens",
        new TableIndex({
          name: "uniq_user_client",
          columnNames: ["user_id", "client_id"],
          isUnique: true,
        }),
      );
    }

    if (
      !migratedTable?.indices.some(
        (index) => index.name === "idx_user_tokens_active",
      )
    ) {
      await queryRunner.createIndex(
        "user_tokens",
        new TableIndex({
          name: "idx_user_tokens_active",
          columnNames: ["token", "client_id", "expires_at", "revoked_at"],
        }),
      );
    }
  }

  // Token hashing and client-channel consolidation are intentionally
  // irreversible. Rolling back the application must not restore clear tokens.
  public async down(): Promise<void> {}
}
