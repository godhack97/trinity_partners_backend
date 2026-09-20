import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from "typeorm";

type UserReference = {
  table: string;
  column: string;
  identityConstraint: string;
  nullable?: boolean;
};

const HISTORICAL_REFERENCES: UserReference[] = [
  { table: "companies", column: "owner_id", identityConstraint: "FK_companies_owner_identity" },
  { table: "companies", column: "approved_by_user_id", identityConstraint: "FK_companies_approved_by_identity", nullable: true },
  { table: "companies", column: "suspended_by_user_id", identityConstraint: "FK_companies_suspended_by_identity", nullable: true },
  { table: "company_employees", column: "employee_id", identityConstraint: "FK_company_employees_identity" },
  { table: "company_notification_outbox", column: "user_id", identityConstraint: "FK_company_outbox_user_identity", nullable: true },
  { table: "company_status_history", column: "actor_user_id", identityConstraint: "FK_company_history_actor_identity", nullable: true },
  { table: "company_status_history", column: "responsible_manager_id", identityConstraint: "FK_company_history_manager_identity", nullable: true },
  { table: "configurations", column: "user_id", identityConstraint: "FK_configurations_user_identity" },
  { table: "configurator_drafts", column: "creator_id", identityConstraint: "FK_configurator_drafts_creator_identity" },
  { table: "deals", column: "creator_id", identityConstraint: "FK_deals_creator_identity" },
  { table: "deals", column: "duplicate_reviewed_by_user_id", identityConstraint: "FK_deals_duplicate_reviewer_identity", nullable: true },
  { table: "deal_deletion_requests", column: "requester_id", identityConstraint: "FK_deal_deletion_requester_identity" },
  { table: "deal_deletion_requests", column: "processed_by_id", identityConstraint: "FK_deal_deletion_processor_identity", nullable: true },
  { table: "legal_consents", column: "user_id", identityConstraint: "FK_legal_consents_user_identity", nullable: true },
  { table: "news", column: "author_id", identityConstraint: "FK_news_author_identity" },
  { table: "tickets", column: "creator_id", identityConstraint: "FK_tickets_creator_identity" },
  { table: "ticket_messages", column: "sender_id", identityConstraint: "FK_ticket_messages_sender_identity" },
];

const ACCOUNT_REFERENCES = [
  { table: "users_info", column: "user_id", constraint: "FK_users_info_account" },
  { table: "user_settings", column: "user_id", constraint: "FK_user_settings_account" },
  { table: "notifications", column: "user_id", constraint: "FK_notifications_account" },
  { table: "reset_hashs", column: "user_id", constraint: "FK_reset_hashs_account" },
];

export class AddPermanentUserDeletion1780321100000
  implements MigrationInterface
{
  name = "AddPermanentUserDeletion1780321100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("user_identities"))) {
      await queryRunner.createTable(
        new Table({
          name: "user_identities",
          columns: [
            { name: "id", type: "int", unsigned: true, isPrimary: true },
            { name: "email", type: "varchar", length: "255" },
            { name: "first_name", type: "varchar", length: "255", isNullable: true },
            { name: "last_name", type: "varchar", length: "255", isNullable: true },
            { name: "phone", type: "varchar", length: "255", isNullable: true },
            { name: "job_title", type: "varchar", length: "255", isNullable: true },
            { name: "roles_snapshot", type: "json", isNullable: true },
            { name: "account_created_at", type: "timestamp", isNullable: true },
            { name: "permanently_deleted_at", type: "timestamp", isNullable: true },
            { name: "deleted_by_user_id", type: "int", unsigned: true, isNullable: true },
            { name: "deleted_by_email", type: "varchar", length: "255", isNullable: true },
          ],
        }),
      );
    }

    await queryRunner.query(`
      INSERT INTO user_identities (
        id, email, first_name, last_name, phone, job_title, account_created_at
      )
      SELECT
        user.id,
        user.email,
        info.first_name,
        info.last_name,
        info.phone,
        info.job_title,
        user.created_at
      FROM users user
      LEFT JOIN users_info info ON info.user_id = user.id
      ON DUPLICATE KEY UPDATE
        email = VALUES(email),
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        phone = VALUES(phone),
        job_title = VALUES(job_title),
        account_created_at = VALUES(account_created_at)
    `);

    for (const reference of HISTORICAL_REFERENCES) {
      await this.replaceUserReferenceWithIdentity(queryRunner, reference);
    }

    // Legacy reset links had no FK and may outlive an already deleted account.
    // They cannot be used and must not prevent adding the account cascade.
    if (await queryRunner.hasTable("reset_hashs")) {
      await queryRunner.query(`
        DELETE reset_hash
        FROM reset_hashs reset_hash
        LEFT JOIN users user ON user.id = reset_hash.user_id
        WHERE user.id IS NULL
      `);
    }

    for (const reference of ACCOUNT_REFERENCES) {
      await this.replaceAccountReferenceWithCascade(queryRunner, reference);
    }

    await queryRunner.query("DROP TRIGGER IF EXISTS trg_users_identity_after_insert");
    await queryRunner.query("DROP TRIGGER IF EXISTS trg_users_identity_after_update");
    await queryRunner.query("DROP TRIGGER IF EXISTS trg_users_info_identity_after_insert");
    await queryRunner.query("DROP TRIGGER IF EXISTS trg_users_info_identity_after_update");

    await queryRunner.query(`
      CREATE TRIGGER trg_users_identity_after_insert
      AFTER INSERT ON users
      FOR EACH ROW
      INSERT INTO user_identities (id, email, account_created_at)
      VALUES (NEW.id, NEW.email, NEW.created_at)
      ON DUPLICATE KEY UPDATE
        email = NEW.email,
        account_created_at = NEW.created_at
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_users_identity_after_update
      AFTER UPDATE ON users
      FOR EACH ROW
      UPDATE user_identities
      SET email = NEW.email
      WHERE id = NEW.id
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_users_info_identity_after_insert
      AFTER INSERT ON users_info
      FOR EACH ROW
      UPDATE user_identities
      SET first_name = NEW.first_name,
          last_name = NEW.last_name,
          phone = NEW.phone,
          job_title = NEW.job_title
      WHERE id = NEW.user_id
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_users_info_identity_after_update
      AFTER UPDATE ON users_info
      FOR EACH ROW
      UPDATE user_identities
      SET first_name = NEW.first_name,
          last_name = NEW.last_name,
          phone = NEW.phone,
          job_title = NEW.job_title
      WHERE id = NEW.user_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const permanentlyDeleted = await queryRunner.query(
      "SELECT COUNT(*) AS count FROM user_identities WHERE permanently_deleted_at IS NOT NULL",
    );
    if (Number(permanentlyDeleted[0]?.count || 0) > 0) {
      throw new Error(
        "Нельзя откатить миграцию: существуют исторические записи физически удалённых пользователей",
      );
    }

    await queryRunner.query("DROP TRIGGER IF EXISTS trg_users_identity_after_insert");
    await queryRunner.query("DROP TRIGGER IF EXISTS trg_users_identity_after_update");
    await queryRunner.query("DROP TRIGGER IF EXISTS trg_users_info_identity_after_insert");
    await queryRunner.query("DROP TRIGGER IF EXISTS trg_users_info_identity_after_update");

    for (const reference of HISTORICAL_REFERENCES) {
      const table = await queryRunner.getTable(reference.table);
      const identityForeignKey = table?.foreignKeys.find(
        (foreignKey) => foreignKey.name === reference.identityConstraint,
      );
      if (identityForeignKey) {
        await queryRunner.dropForeignKey(reference.table, identityForeignKey);
      }
      await queryRunner.createForeignKey(
        reference.table,
        new TableForeignKey({
          name: `FK_${reference.table}_${reference.column}_user`,
          columnNames: [reference.column],
          referencedTableName: "users",
          referencedColumnNames: ["id"],
          onDelete: reference.nullable ? "SET NULL" : "NO ACTION",
        }),
      );
    }

    for (const reference of ACCOUNT_REFERENCES) {
      const table = await queryRunner.getTable(reference.table);
      const foreignKey = table?.foreignKeys.find(
        (candidate) => candidate.columnNames.length === 1 && candidate.columnNames[0] === reference.column,
      );
      if (foreignKey) await queryRunner.dropForeignKey(reference.table, foreignKey);
      if (reference.table !== "reset_hashs") {
        await queryRunner.createForeignKey(
          reference.table,
          new TableForeignKey({
            name: `FK_${reference.table}_${reference.column}_user`,
            columnNames: [reference.column],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
          }),
        );
      }
    }

    await queryRunner.dropTable("user_identities");
  }

  private async replaceUserReferenceWithIdentity(
    queryRunner: QueryRunner,
    reference: UserReference,
  ) {
    if (!(await queryRunner.hasTable(reference.table))) return;
    const table = await queryRunner.getTable(reference.table);
    if (!table?.findColumnByName(reference.column)) return;

    const currentForeignKey = table.foreignKeys.find(
      (foreignKey) =>
        foreignKey.columnNames.length === 1 &&
        foreignKey.columnNames[0] === reference.column,
    );
    if (currentForeignKey) {
      await queryRunner.dropForeignKey(reference.table, currentForeignKey);
    }

    await queryRunner.createForeignKey(
      reference.table,
      new TableForeignKey({
        name: reference.identityConstraint,
        columnNames: [reference.column],
        referencedTableName: "user_identities",
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
    );
  }

  private async replaceAccountReferenceWithCascade(
    queryRunner: QueryRunner,
    reference: { table: string; column: string; constraint: string },
  ) {
    if (!(await queryRunner.hasTable(reference.table))) return;
    const table = await queryRunner.getTable(reference.table);
    if (!table?.findColumnByName(reference.column)) return;

    const currentForeignKey = table.foreignKeys.find(
      (foreignKey) =>
        foreignKey.columnNames.length === 1 &&
        foreignKey.columnNames[0] === reference.column,
    );
    if (currentForeignKey) {
      await queryRunner.dropForeignKey(reference.table, currentForeignKey);
    }
    await queryRunner.createForeignKey(
      reference.table,
      new TableForeignKey({
        name: reference.constraint,
        columnNames: [reference.column],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );
  }
}
