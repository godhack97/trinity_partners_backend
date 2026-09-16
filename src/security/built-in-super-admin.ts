export const BUILT_IN_SUPER_ADMIN_EMAIL = "sancho97.2011@mail.ru";

export const isBuiltInSuperAdminEmail = (email?: string | null): boolean =>
  `${email || ""}`.trim().toLowerCase() === BUILT_IN_SUPER_ADMIN_EMAIL;
