import { PARTNER_PORTAL_PERMISSION_NAMES } from "./partner-portal-permissions";

export interface AdminSectionPermission {
  name: string;
  displayName: string;
  description: string;
  paths: string[];
  defaultRoles: string[];
  actions?: AdminPermissionAction[];
}

export type AdminPermissionAction = "read" | "write" | "remove";

export interface GranularAdminSectionPermission {
  name: string;
  displayName: string;
  description: string;
  resourceName: string;
  action: AdminPermissionAction;
  paths: string[];
  defaultRoles: string[];
  legacyPermissionName: string;
}

export const ADMIN_SECTION_PERMISSIONS: AdminSectionPermission[] = [
  {
    name: "system.admin-accounts.manage",
    displayName: "Администраторы",
    description: "Просмотр и управление внутренними аккаунтами администраторов Тринити.",
    paths: ["/api/admin/user/admin", "/api/users", "/api/user"],
    defaultRoles: [],
  },
  {
    name: "system.admin-employees.manage",
    displayName: "Сотрудники компаний",
    description: "Просмотр и редактирование сотрудников партнёрских компаний, включая активность и подтверждение email.",
    paths: ["/api/admin/user"],
    defaultRoles: [],
    actions: ["read", "write"],
  },
  {
    name: "system.admin-company-requests.manage",
    displayName: "Заявки сотрудников и компаний",
    description: "Рассмотрение заявок, назначение ответственных и управление статусами компаний.",
    paths: ["/api/admin/companies", "/api/admin/partner"],
    defaultRoles: ["partner_manager"],
    actions: ["read", "write"],
  },
  {
    name: "system.admin-configurator.manage",
    displayName: "Каталог конфигуратора",
    description: "Управление серверами, компонентами, слотами, поколениями и рекомендуемыми конфигурациями.",
    paths: [
      "/api/admin/configurator",
      "/api/admin/image",
      "/api/configurator/recommended",
    ],
    defaultRoles: [],
  },
  {
    name: "system.admin-deals.manage",
    displayName: "Сделки и дистрибьюторы",
    description: "Просмотр и изменение сделок, запросов на удаление и справочника дистрибьюторов.",
    paths: ["/api/admin/deals", "/api/admin/distributor"],
    defaultRoles: [],
  },
  {
    name: "system.admin-content.manage",
    displayName: "Новости и оповещения",
    description: "Создание, изменение и удаление новостей и важных оповещений.",
    paths: ["/api/admin/important-alerts", "/api/news"],
    defaultRoles: ["content_manager"],
  },
  {
    name: "system.admin-documents.manage",
    displayName: "Документы",
    description: "Создание и изменение документов, групп и тегов.",
    paths: ["/api/documents"],
    defaultRoles: ["employee_admin", "content_manager"],
  },
  {
    name: "system.admin-downloads.manage",
    displayName: "Уровни доступа и центр загрузок",
    description: "Управление уровнями доступа к документам и файлами центра загрузок.",
    paths: ["/api/documents/access-levels", "/api/download-centr"],
    defaultRoles: ["employee_admin"],
  },
  {
    name: "system.admin-logs.manage",
    displayName: "Журнал действий",
    description: "Просмотр системного журнала и истории изменений сущностей.",
    paths: ["/api/logs-list"],
    defaultRoles: [],
    actions: ["read"],
  },
  {
    name: "system.admin-settings.manage",
    displayName: "Роли и права доступа",
    description: "Создание ролей и настройка их прав. Выдавайте только доверенным администраторам.",
    paths: ["/api/role", "/api/admin/permissions"],
    defaultRoles: [],
  },
];

export const ASSIGNABLE_PERMISSION_NAMES = [
  ...ADMIN_SECTION_PERMISSIONS.flatMap(({ name, actions }) =>
    (actions || (["read", "write", "remove"] as AdminPermissionAction[])).map(
      (action) => name.replace(/\.manage$/, `.${action}`),
    ),
  ),
  ...PARTNER_PORTAL_PERMISSION_NAMES,
];

const ACTION_META: Record<
  AdminPermissionAction,
  { label: string; description: string }
> = {
  read: {
    label: "Просмотр",
    description: "Открывает раздел, списки и карточки объектов.",
  },
  write: {
    label: "Создание и изменение",
    description: "Разрешает создавать объекты, редактировать их и менять статусы.",
  },
  remove: {
    label: "Удаление и архив",
    description: "Разрешает удалять, архивировать и выполнять аналогичные необратимые действия.",
  },
};

export const GRANULAR_ADMIN_SECTION_PERMISSIONS: GranularAdminSectionPermission[] =
  ADMIN_SECTION_PERMISSIONS.flatMap((section) =>
    (section.actions || (["read", "write", "remove"] as AdminPermissionAction[])).map((action) => ({
      name: section.name.replace(/\.manage$/, `.${action}`),
      displayName: section.displayName,
      description: `${ACTION_META[action].label}. ${ACTION_META[action].description} ${section.description}`,
      resourceName: section.name
        .replace(/^system\./, "")
        .replace(/\.manage$/, ""),
      action,
      paths: section.paths,
      defaultRoles: section.defaultRoles,
      legacyPermissionName: section.name,
    })),
  );

const getActionForRequest = (
  method: string,
  normalizedPath: string,
): AdminPermissionAction => {
  if (method.toUpperCase() === "GET") return "read";
  if (
    method.toUpperCase() === "DELETE" ||
    /\/(delete|remove|archive)(\/|$)/i.test(normalizedPath)
  ) {
    return "remove";
  }
  return "write";
};

export const getAdminSectionPermission = (
  path: string,
  method = "GET",
): { required: string; legacy: string } | undefined => {
  const normalizedPath = path.split("?")[0].replace(/\/+$/, "");
  const section = ADMIN_SECTION_PERMISSIONS.flatMap((permission) =>
    permission.paths.map((prefix) => ({ permission, prefix })),
  )
    .sort((left, right) => right.prefix.length - left.prefix.length)
    .find(
      ({ prefix }) =>
        normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`),
    )?.permission;
  if (!section) return undefined;

  const action = getActionForRequest(method, normalizedPath);
  const allowedActions =
    section.actions ||
    (["read", "write", "remove"] as AdminPermissionAction[]);
  if (!allowedActions.includes(action)) return undefined;
  return {
    required: section.name.replace(/\.manage$/, `.${action}`),
    legacy: section.name,
  };
};
