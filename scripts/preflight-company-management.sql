-- Read-only checks to run before 1780316200000-AddCompanyManagementFoundation.
-- The result sets are intended to be saved with the deployment artifacts.

SELECT status, COUNT(*) AS companies_count
FROM companies
GROUP BY status
ORDER BY status;

SELECT
  COUNT(*) AS rejected_to_lock,
  SUM(CASE WHEN owner.manager_id IS NULL
            AND company.validated_by_manager_id IS NULL THEN 1 ELSE 0 END)
    AS without_manager_source,
  SUM(CASE WHEN owner.manager_id IS NOT NULL
            AND company.validated_by_manager_id IS NOT NULL
            AND owner.manager_id <> company.validated_by_manager_id
           THEN 1 ELSE 0 END) AS manager_source_conflicts
FROM companies company
INNER JOIN users owner ON owner.id = company.owner_id
WHERE company.status = 'reject';

SELECT
  employee_user.id AS user_id,
  employee_user.email,
  company_employee.company_id,
  primary_role.name AS primary_role,
  GROUP_CONCAT(DISTINCT secondary_role.name ORDER BY secondary_role.name)
    AS secondary_roles
FROM company_employees company_employee
INNER JOIN users employee_user
  ON employee_user.id = company_employee.employee_id
LEFT JOIN roles primary_role ON primary_role.id = employee_user.role_id
LEFT JOIN user_roles user_role ON user_role.user_id = employee_user.id
LEFT JOIN roles secondary_role ON secondary_role.id = user_role.role_id
GROUP BY
  employee_user.id,
  employee_user.email,
  company_employee.company_id,
  primary_role.name
HAVING primary_role.name = 'technical_specialist'
   OR FIND_IN_SET('technical_specialist', secondary_roles) > 0
ORDER BY employee_user.id, company_employee.company_id;

SELECT
  company.id AS company_id,
  company.name,
  owner.manager_id,
  company.validated_by_manager_id,
  CASE
    WHEN owner.manager_id IS NOT NULL THEN 'owner.manager_id'
    WHEN company.validated_by_manager_id IS NOT NULL
      THEN 'company.validated_by_manager_id'
    ELSE 'missing'
  END AS manager_backfill_source
FROM companies company
INNER JOIN users owner ON owner.id = company.owner_id
WHERE company.status IN ('accept', 'suspended')
ORDER BY manager_backfill_source, company.id;

SELECT
  COUNT(*) AS active_or_suspended_total,
  SUM(
    owner_manager.id IS NOT NULL
    AND owner_manager.is_activated = 1
    AND owner_manager.deleted_at IS NULL
    AND (
      EXISTS (
        SELECT 1
        FROM roles owner_primary_role
        WHERE owner_primary_role.id = owner_manager.role_id
          AND owner_primary_role.name = 'partner_manager'
          AND owner_primary_role.deleted_at IS NULL
      )
      OR EXISTS (
        SELECT 1
        FROM user_roles owner_user_role
        INNER JOIN roles owner_secondary_role
          ON owner_secondary_role.id = owner_user_role.role_id
        WHERE owner_user_role.user_id = owner_manager.id
          AND owner_secondary_role.name = 'partner_manager'
          AND owner_secondary_role.deleted_at IS NULL
      )
    )
  ) AS valid_owner_manager_source,
  SUM(
    NOT (
      owner_manager.id IS NOT NULL
      AND owner_manager.is_activated = 1
      AND owner_manager.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1
          FROM roles owner_primary_role
          WHERE owner_primary_role.id = owner_manager.role_id
            AND owner_primary_role.name = 'partner_manager'
            AND owner_primary_role.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1
          FROM user_roles owner_user_role
          INNER JOIN roles owner_secondary_role
            ON owner_secondary_role.id = owner_user_role.role_id
          WHERE owner_user_role.user_id = owner_manager.id
            AND owner_secondary_role.name = 'partner_manager'
            AND owner_secondary_role.deleted_at IS NULL
        )
      )
    )
    AND validation_manager.id IS NOT NULL
    AND validation_manager.is_activated = 1
    AND validation_manager.deleted_at IS NULL
    AND (
      EXISTS (
        SELECT 1
        FROM roles validation_primary_role
        WHERE validation_primary_role.id = validation_manager.role_id
          AND validation_primary_role.name = 'partner_manager'
          AND validation_primary_role.deleted_at IS NULL
      )
      OR EXISTS (
        SELECT 1
        FROM user_roles validation_user_role
        INNER JOIN roles validation_secondary_role
          ON validation_secondary_role.id = validation_user_role.role_id
        WHERE validation_user_role.user_id = validation_manager.id
          AND validation_secondary_role.name = 'partner_manager'
          AND validation_secondary_role.deleted_at IS NULL
      )
    )
  ) AS valid_validation_manager_fallback,
  SUM(
    NOT (
      (
        owner_manager.id IS NOT NULL
        AND owner_manager.is_activated = 1
        AND owner_manager.deleted_at IS NULL
        AND (
          EXISTS (
            SELECT 1
            FROM roles owner_primary_role
            WHERE owner_primary_role.id = owner_manager.role_id
              AND owner_primary_role.name = 'partner_manager'
              AND owner_primary_role.deleted_at IS NULL
          )
          OR EXISTS (
            SELECT 1
            FROM user_roles owner_user_role
            INNER JOIN roles owner_secondary_role
              ON owner_secondary_role.id = owner_user_role.role_id
            WHERE owner_user_role.user_id = owner_manager.id
              AND owner_secondary_role.name = 'partner_manager'
              AND owner_secondary_role.deleted_at IS NULL
          )
        )
      )
      OR (
        validation_manager.id IS NOT NULL
        AND validation_manager.is_activated = 1
        AND validation_manager.deleted_at IS NULL
        AND (
          EXISTS (
            SELECT 1
            FROM roles validation_primary_role
            WHERE validation_primary_role.id = validation_manager.role_id
              AND validation_primary_role.name = 'partner_manager'
              AND validation_primary_role.deleted_at IS NULL
          )
          OR EXISTS (
            SELECT 1
            FROM user_roles validation_user_role
            INNER JOIN roles validation_secondary_role
              ON validation_secondary_role.id = validation_user_role.role_id
            WHERE validation_user_role.user_id = validation_manager.id
              AND validation_secondary_role.name = 'partner_manager'
              AND validation_secondary_role.deleted_at IS NULL
          )
        )
      )
    )
  ) AS requires_manual_manager_assignment
FROM companies company
INNER JOIN users owner ON owner.id = company.owner_id
LEFT JOIN users owner_manager ON owner_manager.id = owner.manager_id
LEFT JOIN users validation_manager
  ON validation_manager.id = company.validated_by_manager_id
WHERE company.status IN ('accept', 'suspended');
