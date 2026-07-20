import { MigrationInterface, QueryRunner } from "typeorm";

type PermissionResourceType = "api" | "menu" | "system";

interface PermissionDefinition {
  name: string;
  description: string;
  displayName: string;
  resourceType: PermissionResourceType;
  resourceName: string;
  action: string;
}

const permission = (
  name: string,
  displayName: string,
  resourceType: PermissionResourceType,
  resourceName: string,
  action: string,
): PermissionDefinition => ({
  name,
  description: `${displayName}: ${action}`,
  displayName,
  resourceType,
  resourceName,
  action,
});

const apiPermissions = (
  key: string,
  displayName: string,
  resourceName: string,
  actions: string[],
): PermissionDefinition[] =>
  actions.map((action) =>
    permission(
      `api.${key}.${action}`,
      displayName,
      "api",
      resourceName,
      action,
    ),
  );

const PERMISSIONS: PermissionDefinition[] = [
  ...apiPermissions("auth", "Авторизация", "/api/auth", ["read", "write"]),
  ...apiPermissions("companies", "Компании", "/api/companies", [
    "read",
    "write",
    "remove",
  ]),
  ...apiPermissions("configurator", "Конфигуратор", "/api/configurator", [
    "read",
    "write",
    "remove",
  ]),
  ...apiPermissions("customers", "Клиенты", "/api/customers", [
    "read",
    "write",
    "remove",
  ]),
  ...apiPermissions("deals", "Сделки", "/api/deals", [
    "read",
    "write",
    "remove",
  ]),
  ...apiPermissions("distributors", "Дистрибьюторы", "/api/distributors", [
    "read",
    "write",
    "remove",
  ]),
  ...apiPermissions("news", "Новости", "/api/news", [
    "read",
    "write",
    "remove",
  ]),
  ...apiPermissions("notifications", "Уведомления", "/api/notifications", [
    "read",
    "write",
    "remove",
  ]),
  ...apiPermissions("profile", "Профиль пользователя", "/api/profile", [
    "read",
    "write",
  ]),
  ...apiPermissions("roles", "Роли", "/api/roles", [
    "read",
    "write",
    "remove",
  ]),
  ...apiPermissions("users", "Пользователи", "/api/users", [
    "read",
    "write",
    "remove",
  ]),
  ...apiPermissions("user-settings", "Настройки пользователя", "/api/user-settings", [
    "read",
    "write",
  ]),
  ...apiPermissions("upload", "Загрузка файлов", "/api/upload", ["write"]),
  ...apiPermissions("user-actions", "Логи действий", "/api/user-actions", [
    "read",
  ]),
  ...apiPermissions(
    "admin.configurator",
    "Админ: Конфигуратор",
    "/api/admin/configurator",
    ["read", "write", "remove"],
  ),
  ...apiPermissions(
    "admin.components",
    "Админ: Компоненты",
    "/api/admin/components",
    ["read", "write", "remove"],
  ),
  ...apiPermissions("admin.servers", "Админ: Серверы", "/api/admin/servers", [
    "read",
    "write",
    "remove",
  ]),
  ...apiPermissions("admin.deals", "Админ: Сделки", "/api/admin/deals", [
    "read",
    "write",
    "remove",
  ]),
  ...apiPermissions(
    "admin.distributors",
    "Админ: Дистрибьюторы",
    "/api/admin/distributors",
    ["read", "write", "remove"],
  ),
  ...apiPermissions("admin.partners", "Админ: Партнеры", "/api/admin/partners", [
    "read",
    "write",
    "remove",
  ]),
  ...apiPermissions("admin.users", "Админ: Пользователи", "/api/admin/users", [
    "read",
    "write",
    "remove",
  ]),
  ...apiPermissions("admin.images", "Админ: Изображения", "/api/admin/images", [
    "read",
    "write",
    "remove",
  ]),
  ...apiPermissions(
    "admin.forbidden-inns",
    "Админ: Запрещенные ИНН",
    "/api/admin/forbidden-inns",
    ["read", "write", "remove"],
  ),
  ...apiPermissions(
    "admin.permissions",
    "Админ: Разрешения",
    "/api/admin/permissions",
    ["read", "write", "remove"],
  ),
  ...[
    ["dashboard", "Главная панель"],
    ["deals", "Раздел сделок"],
    ["companies", "Раздел компаний"],
    ["customers", "Раздел клиентов"],
    ["distributors", "Раздел дистрибьюторов"],
    ["configurator", "Конфигуратор"],
    ["news", "Раздел новостей"],
    ["profile", "Профиль"],
    ["admin", "Административная панель"],
    ["analytics", "Аналитика"],
    ["reports", "Отчеты"],
  ].map(([resourceName, displayName]) =>
    permission(
      `menu.${resourceName}.read`,
      displayName,
      "menu",
      resourceName,
      "read",
    ),
  ),
  ...[
    ["permissions", "write", "Система разрешений"],
    ["permissions", "manage", "Система разрешений"],
    ["integrations", "write", "Интеграции"],
    ["settings", "read", "Системные настройки"],
    ["settings", "write", "Системные настройки"],
    ["logs", "read", "Системные логи"],
    ["backup", "write", "Резервное копирование"],
    ["maintenance", "write", "Обслуживание системы"],
  ].map(([resourceName, action, displayName]) =>
    permission(
      `system.${resourceName}.${action}`,
      displayName,
      "system",
      resourceName,
      action,
    ),
  ),
];

export class BootstrapAccessControl1779999999999
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id int unsigned NOT NULL AUTO_INCREMENT,
        name varchar(255) NOT NULL COMMENT 'Уникальное имя разрешения',
        description varchar(255) DEFAULT NULL COMMENT 'Описание разрешения',
        resource_type enum('api','menu','system') NOT NULL COMMENT 'Тип ресурса',
        resource_name varchar(255) NOT NULL COMMENT 'Имя ресурса',
        action varchar(50) NOT NULL COMMENT 'Действие',
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        display_name varchar(255) DEFAULT NULL COMMENT 'Человекочитаемое название ресурса',
        PRIMARY KEY (id),
        UNIQUE KEY unique_permission_name (name),
        UNIQUE KEY unique_permission (resource_type, resource_name, action)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id int unsigned NOT NULL AUTO_INCREMENT,
        role_id int unsigned NOT NULL,
        permission_id int unsigned NOT NULL,
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY unique_role_permission (role_id, permission_id),
        KEY role_id (role_id),
        KEY permission_id (permission_id),
        CONSTRAINT role_permissions_role_fk FOREIGN KEY (role_id)
          REFERENCES roles(id) ON DELETE CASCADE,
        CONSTRAINT role_permissions_permission_fk FOREIGN KEY (permission_id)
          REFERENCES permissions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id int unsigned NOT NULL,
        role_id int unsigned NOT NULL,
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, role_id),
        KEY role_id (role_id),
        CONSTRAINT user_roles_user_fk FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT user_roles_role_fk FOREIGN KEY (role_id)
          REFERENCES roles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);

    await queryRunner.query(`
      INSERT INTO roles (name, description)
      SELECT 'partner_manager', 'Менеджер партнеров'
      WHERE NOT EXISTS (
        SELECT 1 FROM roles WHERE name = 'partner_manager'
      )
    `);

    for (const definition of PERMISSIONS) {
      await queryRunner.query(
        `
          INSERT INTO permissions (
            name,
            description,
            display_name,
            resource_type,
            resource_name,
            action
          )
          SELECT ?, ?, ?, ?, ?, ?
          WHERE NOT EXISTS (
            SELECT 1
            FROM permissions
            WHERE name = ?
              OR (
                resource_type = ?
                AND resource_name = ?
                AND action = ?
              )
          )
        `,
        [
          definition.name,
          definition.description,
          definition.displayName,
          definition.resourceType,
          definition.resourceName,
          definition.action,
          definition.name,
          definition.resourceType,
          definition.resourceName,
          definition.action,
        ],
      );
    }
  }

  // This is a baseline migration for tables that already exist in deployed
  // databases. Dropping shared access-control data on rollback would be unsafe.
  public async down(): Promise<void> {}
}
