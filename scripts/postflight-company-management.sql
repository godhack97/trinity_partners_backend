-- Read-only checks to run after company management migrations
-- 1780316200000 and 1780316300000.

SELECT status, COUNT(*) AS companies_count
FROM companies
GROUP BY status
ORDER BY FIELD(status, 'pending', 'accept', 'suspended');

SELECT
  SUM(status IN ('accept', 'suspended') AND responsible_manager_id IS NULL)
    AS active_or_suspended_without_manager,
  SUM(status = 'pending' AND review_locked_at IS NOT NULL
      AND (review_lock_reason IS NULL OR TRIM(review_lock_reason) = ''))
    AS locked_pending_without_reason,
  SUM(status = 'suspended'
      AND (suspension_reason IS NULL OR TRIM(suspension_reason) = ''))
    AS suspended_without_reason
FROM companies;

SELECT COUNT(*) AS company_linked_technical_specialists
FROM company_employees company_employee
INNER JOIN users employee_user ON employee_user.id = company_employee.employee_id
LEFT JOIN roles primary_role ON primary_role.id = employee_user.role_id
LEFT JOIN user_roles user_role ON user_role.user_id = employee_user.id
LEFT JOIN roles secondary_role ON secondary_role.id = user_role.role_id
WHERE primary_role.name = 'technical_specialist'
   OR secondary_role.name = 'technical_specialist';

SELECT COUNT(*) AS invalid_assigned_responsible_managers
FROM companies company
LEFT JOIN users manager ON manager.id = company.responsible_manager_id
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
  );

SELECT action, COUNT(*) AS events_count
FROM company_status_history
GROUP BY action
ORDER BY action;

SELECT status, channel, COUNT(*) AS jobs_count
FROM company_notification_outbox
GROUP BY status, channel
ORDER BY status, channel;

SELECT
  COUNT(*) AS failed_jobs,
  MIN(created_at) AS oldest_failed_at,
  MAX(attempts) AS max_attempts
FROM company_notification_outbox
WHERE status = 'failed';

SELECT COUNT(*) AS duplicate_site_delivery_keys
FROM (
  SELECT delivery_key
  FROM notifications
  WHERE delivery_key IS NOT NULL
  GROUP BY delivery_key
  HAVING COUNT(*) > 1
) duplicate_delivery_keys;
