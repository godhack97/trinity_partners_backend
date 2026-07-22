import { MigrationInterface, QueryRunner } from "typeorm";

export class NormalizeCompanyResponsibleManagers1780316400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO company_status_history (
        company_id,
        action,
        from_status,
        to_status,
        actor_user_id,
        responsible_manager_id,
        reason,
        details,
        created_at,
        updated_at
      )
      SELECT
        company.id,
        'legacy_manager_assignment_cleared',
        company.status,
        company.status,
        NULL,
        NULL,
        'Некорректное назначение удалено при нормализации менеджеров компаний',
        JSON_OBJECT(
          'previous_responsible_manager_id', company.responsible_manager_id,
          'migration', '1780316400000'
        ),
        CURRENT_TIMESTAMP(6),
        CURRENT_TIMESTAMP(6)
      FROM companies company
      LEFT JOIN users manager
        ON manager.id = company.responsible_manager_id
      WHERE company.responsible_manager_id IS NOT NULL
        AND (
          manager.id IS NULL
          OR manager.is_activated <> 1
          OR manager.deleted_at IS NOT NULL
          OR NOT (
            EXISTS (
              SELECT 1
              FROM roles primary_role
              WHERE primary_role.id = manager.role_id
                AND primary_role.name = 'partner_manager'
                AND primary_role.deleted_at IS NULL
            )
            OR EXISTS (
              SELECT 1
              FROM user_roles manager_user_role
              INNER JOIN roles secondary_role
                ON secondary_role.id = manager_user_role.role_id
              WHERE manager_user_role.user_id = manager.id
                AND secondary_role.name = 'partner_manager'
                AND secondary_role.deleted_at IS NULL
            )
          )
        )
    `);

    await queryRunner.query(`
      UPDATE companies company
      LEFT JOIN users manager
        ON manager.id = company.responsible_manager_id
      SET company.responsible_manager_id = NULL
      WHERE company.responsible_manager_id IS NOT NULL
        AND (
          manager.id IS NULL
          OR manager.is_activated <> 1
          OR manager.deleted_at IS NOT NULL
          OR NOT (
            EXISTS (
              SELECT 1
              FROM roles primary_role
              WHERE primary_role.id = manager.role_id
                AND primary_role.name = 'partner_manager'
                AND primary_role.deleted_at IS NULL
            )
            OR EXISTS (
              SELECT 1
              FROM user_roles manager_user_role
              INNER JOIN roles secondary_role
                ON secondary_role.id = manager_user_role.role_id
              WHERE manager_user_role.user_id = manager.id
                AND secondary_role.name = 'partner_manager'
                AND secondary_role.deleted_at IS NULL
            )
          )
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE companies company
      INNER JOIN company_status_history history
        ON history.company_id = company.id
        AND history.action = 'legacy_manager_assignment_cleared'
        AND JSON_UNQUOTE(JSON_EXTRACT(history.details, '$.migration')) =
          '1780316400000'
      SET company.responsible_manager_id = CAST(
        JSON_UNQUOTE(
          JSON_EXTRACT(history.details, '$.previous_responsible_manager_id')
        ) AS UNSIGNED
      )
      WHERE company.responsible_manager_id IS NULL
    `);

    await queryRunner.query(`
      DELETE FROM company_status_history
      WHERE action = 'legacy_manager_assignment_cleared'
        AND JSON_UNQUOTE(JSON_EXTRACT(details, '$.migration')) =
          '1780316400000'
    `);
  }
}
