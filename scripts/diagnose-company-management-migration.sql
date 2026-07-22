-- Read-only diagnostics after an interrupted company-management migration.

SELECT
  table_name,
  column_name,
  column_type,
  is_nullable,
  column_key
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND (
    (table_name = 'users' AND column_name = 'id')
    OR (table_name = 'companies' AND column_name IN (
      'id',
      'owner_id',
      'contact_email',
      'contact_phone',
      'responsible_manager_id',
      'approved_by_user_id',
      'review_locked_by_user_id',
      'suspended_by_user_id'
    ))
  )
ORDER BY table_name, ordinal_position;

SELECT
  constraint_name,
  table_name,
  column_name,
  referenced_table_name,
  referenced_column_name
FROM information_schema.key_column_usage
WHERE table_schema = DATABASE()
  AND table_name IN ('companies', 'company_status_history', 'company_notification_outbox')
ORDER BY table_name, constraint_name, ordinal_position;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN ('company_status_history', 'company_notification_outbox');

SELECT
  company.id AS company_id,
  company.responsible_manager_id,
  manager.is_activated,
  manager.deleted_at,
  primary_role.name AS primary_role,
  GROUP_CONCAT(DISTINCT secondary_role.name ORDER BY secondary_role.name)
    AS secondary_roles
FROM companies company
LEFT JOIN users manager ON manager.id = company.responsible_manager_id
LEFT JOIN roles primary_role ON primary_role.id = manager.role_id
LEFT JOIN user_roles user_role ON user_role.user_id = manager.id
LEFT JOIN roles secondary_role ON secondary_role.id = user_role.role_id
WHERE company.responsible_manager_id IS NOT NULL
GROUP BY
  company.id,
  company.responsible_manager_id,
  manager.is_activated,
  manager.deleted_at,
  primary_role.name
ORDER BY company.id;

SELECT
  COUNT(DISTINCT manager.id) AS valid_active_partner_managers
FROM users manager
LEFT JOIN roles primary_role ON primary_role.id = manager.role_id
LEFT JOIN user_roles user_role ON user_role.user_id = manager.id
LEFT JOIN roles secondary_role ON secondary_role.id = user_role.role_id
WHERE manager.is_activated = 1
  AND manager.deleted_at IS NULL
  AND (
    (primary_role.name = 'partner_manager' AND primary_role.deleted_at IS NULL)
    OR (secondary_role.name = 'partner_manager' AND secondary_role.deleted_at IS NULL)
  );
