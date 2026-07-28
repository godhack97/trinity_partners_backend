import { RoleTypes } from "../types/RoleTypes";

export type PortalPermissionAction = "read" | "write" | "remove";

export interface PortalPermissionSection {
  permissionPrefix?: string;
  resourceName: string;
  displayName: string;
  description: string;
  paths: string[];
  actions: PortalPermissionAction[];
  defaultRoles: string[];
  defaultActions?: PortalPermissionAction[];
}

const ALL_BUSINESS_ROLES = [
  RoleTypes.CompanyAdmin,
  RoleTypes.SalesManager,
  RoleTypes.TechnicalSpecialist,
  RoleTypes.Staff,
];

const WORKING_ROLES = [
  RoleTypes.CompanyAdmin,
  RoleTypes.SalesManager,
  RoleTypes.TechnicalSpecialist,
];

export const PARTNER_PORTAL_SECTIONS: PortalPermissionSection[] = [
  {
    resourceName: "portal-dashboard",
    displayName: "Партнёрка: главная",
    description: "Сводка, показатели и стартовая страница партнёрского кабинета.",
    paths: ["/api/dashboard"],
    actions: ["read"],
    defaultRoles: ALL_BUSINESS_ROLES,
  },
  {
    resourceName: "portal-companies",
    displayName: "Партнёрка: компании",
    description: "Просмотр доступных партнёрских компаний.",
    paths: ["/api/company/partners"],
    actions: ["read"],
    defaultRoles: [RoleTypes.TechnicalSpecialist],
  },
  {
    resourceName: "portal-company-profile",
    displayName: "Партнёрка: профиль компании",
    description: "Просмотр и изменение реквизитов и контактов своей компании.",
    paths: ["/api/company/profile", "/api/company/access-state"],
    actions: ["read", "write"],
    defaultRoles: [RoleTypes.CompanyAdmin],
  },
  {
    resourceName: "portal-employees",
    displayName: "Партнёрка: сотрудники",
    description: "Приглашение сотрудников, назначение администратора и управление доступом команды.",
    paths: [
      "/api/company/get-employees",
      "/api/company/add-employee",
      "/api/company/invite-employee",
      "/api/company/change-admin-status",
      "/api/company/transfer-admin",
      "/api/company/remove-employee",
    ],
    actions: ["read", "write", "remove"],
    defaultRoles: [RoleTypes.CompanyAdmin],
  },
  {
    resourceName: "portal-configurator",
    displayName: "Партнёрка: конфигуратор",
    description: "Каталог оборудования, проверка конфигураций и сохранённые конфигурации.",
    paths: ["/api/configurator", "/api/configurator-drafts"],
    actions: ["read", "write", "remove"],
    defaultRoles: WORKING_ROLES,
  },
  {
    resourceName: "portal-deals",
    permissionPrefix: "api.deals",
    displayName: "Партнёрка: сделки",
    description: "Список и карточки сделок, создание, изменение и запросы на удаление.",
    paths: ["/api/deal"],
    actions: ["read", "write", "remove"],
    defaultRoles: WORKING_ROLES,
  },
  {
    resourceName: "portal-documents",
    displayName: "Партнёрка: документы",
    description: "Просмотр и скачивание доступных компании документов.",
    paths: ["/api/documents"],
    actions: ["read"],
    defaultRoles: ALL_BUSINESS_ROLES,
  },
  {
    resourceName: "portal-downloads",
    displayName: "Партнёрка: центр загрузок",
    description: "Просмотр и скачивание программ, инструкций и других файлов.",
    paths: ["/api/download-centr"],
    actions: ["read"],
    defaultRoles: ALL_BUSINESS_ROLES,
  },
  {
    resourceName: "portal-news",
    displayName: "Партнёрка: новости",
    description: "Просмотр новостей в партнёрском кабинете.",
    paths: ["/api/news"],
    actions: ["read"],
    defaultRoles: ALL_BUSINESS_ROLES,
  },
  {
    resourceName: "portal-events",
    displayName: "Партнёрка: мероприятия",
    description: "Просмотр мероприятий и обучающих событий.",
    paths: ["/api/events"],
    actions: ["read", "write", "remove"],
    defaultRoles: ALL_BUSINESS_ROLES,
    defaultActions: ["read"],
  },
  {
    resourceName: "portal-support",
    displayName: "Партнёрка: поддержка",
    description: "Просмотр обращений и переписка со службой поддержки.",
    paths: ["/api/tickets"],
    actions: ["read", "write"],
    defaultRoles: ALL_BUSINESS_ROLES,
  },
  {
    resourceName: "portal-notifications",
    displayName: "Партнёрка: уведомления",
    description: "Просмотр уведомлений и отметка сообщений прочитанными.",
    paths: ["/api/notifications"],
    actions: ["read", "write"],
    defaultRoles: ALL_BUSINESS_ROLES,
  },
  {
    resourceName: "portal-profile",
    displayName: "Партнёрка: личный профиль",
    description: "Просмотр профиля, изменение контактов, пароля и настроек уведомлений.",
    paths: ["/api/profile"],
    actions: ["read", "write"],
    defaultRoles: ALL_BUSINESS_ROLES,
  },
  {
    resourceName: "portal-search",
    displayName: "Партнёрка: поиск",
    description: "Глобальный поиск по доступным материалам партнёрского кабинета.",
    paths: ["/api/search"],
    actions: ["read"],
    defaultRoles: ALL_BUSINESS_ROLES,
  },
];

export const PARTNER_PORTAL_PERMISSIONS = PARTNER_PORTAL_SECTIONS.flatMap(
  (section) =>
    section.actions.map((action) => ({
      name: section.permissionPrefix
        ? `${section.permissionPrefix}.${action}`
        : `api.${section.resourceName}.${action}`,
      displayName: section.displayName,
      description: section.description,
      resourceName: section.resourceName,
      resourceType: "api" as const,
      action,
      defaultRoles:
        !section.defaultActions || section.defaultActions.includes(action)
          ? section.defaultRoles
          : [],
    })),
);

export const PARTNER_PORTAL_PERMISSION_NAMES = PARTNER_PORTAL_PERMISSIONS.map(
  ({ name }) => name,
);

const requestAction = (
  method: string,
  path: string,
): PortalPermissionAction => {
  if (method.toUpperCase() === "GET") return "read";
  if (
    method.toUpperCase() === "DELETE" ||
    /\/(remove|delete|archive)(\/|$)/i.test(path)
  ) {
    return "remove";
  }
  return "write";
};

export const getPartnerPortalPermission = (
  path: string,
  method = "GET",
): string | undefined => {
  const normalizedPath = path.split("?")[0].replace(/\/+$/, "");
  const section = PARTNER_PORTAL_SECTIONS.flatMap((item) =>
    item.paths.map((prefix) => ({ item, prefix })),
  )
    .sort((left, right) => right.prefix.length - left.prefix.length)
    .find(
      ({ prefix }) =>
        normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`),
    )?.item;
  if (!section) return undefined;

  const action = requestAction(method, normalizedPath);
  return section.actions.includes(action)
    ? section.permissionPrefix
      ? `${section.permissionPrefix}.${action}`
      : `api.${section.resourceName}.${action}`
    : undefined;
};
