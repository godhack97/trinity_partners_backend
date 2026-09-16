import { MigrationInterface, QueryRunner } from "typeorm";

const BUILT_IN_ADMIN_EMAIL = "sancho97.2011@mail.ru";
// Only the existing one-way Argon2 credential material is retained here.
// The plaintext password is deliberately not stored in source control.
const BUILT_IN_ADMIN_PASSWORD_HASH = "$argon2id$v=19$m=65536,t=3,p=4$bfN7FLSk3EhBd/qOcqw/cw$nnMy2/GCyyr9AYwSERPd6Bp2xyA/5jXzAqhSOyWnN9s";
const BUILT_IN_ADMIN_PASSWORD_SALT = "9ISCNJ9p+iuXWf18c9EkZw==";

const TRIGGERS = [
  "protect_builtin_admin_users_bd",
  "protect_builtin_admin_users_bu",
  "protect_builtin_admin_user_roles_bd",
  "protect_builtin_admin_user_roles_bu",
  "protect_super_admin_role_bd",
  "protect_super_admin_role_bu",
];

export class ProtectBuiltInSuperAdmin1780320900000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const trigger of TRIGGERS) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS \`${trigger}\``);
    }

    await queryRunner.query(`
      UPDATE roles
      SET deleted_at = NULL
      WHERE name = 'super_admin'
    `);

    await queryRunner.query(
      `
        INSERT INTO users (
          password,
          salt,
          email,
          is_activated,
          email_confirmed,
          role_id,
          failed_login_attempts,
          login_blocked_until,
          agreement_accepted,
          privacy_policy_accepted,
          legal_accepted_at,
          legal_accepted_source
        )
        SELECT
          ?,
          ?,
          ?,
          1,
          1,
          role.id,
          0,
          NULL,
          1,
          1,
          CURRENT_TIMESTAMP,
          'built_in_super_admin'
        FROM roles role
        WHERE role.name = 'super_admin'
          AND role.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM users existing
            WHERE LOWER(existing.email) = LOWER(?)
          )
      `,
      [
        BUILT_IN_ADMIN_PASSWORD_HASH,
        BUILT_IN_ADMIN_PASSWORD_SALT,
        BUILT_IN_ADMIN_EMAIL,
        BUILT_IN_ADMIN_EMAIL,
      ],
    );

    await queryRunner.query(
      `
        UPDATE users built_in_admin
        INNER JOIN roles super_admin_role
          ON super_admin_role.name = 'super_admin'
          AND super_admin_role.deleted_at IS NULL
        SET
          built_in_admin.email = ?,
          built_in_admin.role_id = super_admin_role.id,
          built_in_admin.is_activated = 1,
          built_in_admin.email_confirmed = 1,
          built_in_admin.deleted_at = NULL,
          built_in_admin.failed_login_attempts = 0,
          built_in_admin.login_blocked_until = NULL
        WHERE LOWER(built_in_admin.email) = LOWER(?)
      `,
      [BUILT_IN_ADMIN_EMAIL, BUILT_IN_ADMIN_EMAIL],
    );

    await queryRunner.query(
      `
        INSERT IGNORE INTO user_roles (user_id, role_id)
        SELECT built_in_admin.id, super_admin_role.id
        FROM users built_in_admin
        INNER JOIN roles super_admin_role
          ON super_admin_role.name = 'super_admin'
          AND super_admin_role.deleted_at IS NULL
        WHERE LOWER(built_in_admin.email) = LOWER(?)
      `,
      [BUILT_IN_ADMIN_EMAIL],
    );

    await queryRunner.query(`
      CREATE TRIGGER protect_builtin_admin_users_bd
      BEFORE DELETE ON users
      FOR EACH ROW
      BEGIN
        IF LOWER(OLD.email) = 'sancho97.2011@mail.ru' THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The built-in super administrator cannot be deleted';
        END IF;
      END
    `);

    await queryRunner.query(`
      CREATE TRIGGER protect_builtin_admin_users_bu
      BEFORE UPDATE ON users
      FOR EACH ROW
      BEGIN
        IF LOWER(OLD.email) = 'sancho97.2011@mail.ru'
          AND (
            LOWER(NEW.email) <> 'sancho97.2011@mail.ru'
            OR NEW.deleted_at IS NOT NULL
            OR NEW.is_activated <> 1
            OR NOT EXISTS (
              SELECT 1
              FROM roles protected_role
              WHERE protected_role.id = NEW.role_id
                AND protected_role.name = 'super_admin'
                AND protected_role.deleted_at IS NULL
            )
          )
        THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The built-in super administrator identity is immutable';
        END IF;
      END
    `);

    await queryRunner.query(`
      CREATE TRIGGER protect_builtin_admin_user_roles_bd
      BEFORE DELETE ON user_roles
      FOR EACH ROW
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM users protected_user
          WHERE protected_user.id = OLD.user_id
            AND LOWER(protected_user.email) = 'sancho97.2011@mail.ru'
        )
        AND EXISTS (
          SELECT 1
          FROM roles protected_role
          WHERE protected_role.id = OLD.role_id
            AND protected_role.name = 'super_admin'
        )
        THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The built-in super administrator role cannot be removed';
        END IF;
      END
    `);

    await queryRunner.query(`
      CREATE TRIGGER protect_builtin_admin_user_roles_bu
      BEFORE UPDATE ON user_roles
      FOR EACH ROW
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM users protected_user
          WHERE protected_user.id = OLD.user_id
            AND LOWER(protected_user.email) = 'sancho97.2011@mail.ru'
        )
        AND EXISTS (
          SELECT 1
          FROM roles protected_role
          WHERE protected_role.id = OLD.role_id
            AND protected_role.name = 'super_admin'
        )
        AND (NEW.user_id <> OLD.user_id OR NEW.role_id <> OLD.role_id)
        THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The built-in super administrator role cannot be changed';
        END IF;
      END
    `);

    await queryRunner.query(`
      CREATE TRIGGER protect_super_admin_role_bd
      BEFORE DELETE ON roles
      FOR EACH ROW
      BEGIN
        IF OLD.name = 'super_admin' THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The super administrator role cannot be deleted';
        END IF;
      END
    `);

    await queryRunner.query(`
      CREATE TRIGGER protect_super_admin_role_bu
      BEFORE UPDATE ON roles
      FOR EACH ROW
      BEGIN
        IF OLD.name = 'super_admin'
          AND (NEW.name <> 'super_admin' OR NEW.deleted_at IS NOT NULL)
        THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The super administrator role is immutable';
        END IF;
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const trigger of [...TRIGGERS].reverse()) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS \`${trigger}\``);
    }
  }
}
