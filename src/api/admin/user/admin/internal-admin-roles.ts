import { RoleTypes } from "@app/types/RoleTypes";

export const INTERNAL_ADMIN_ROLE_NAMES = [
  RoleTypes.SuperAdmin,
  RoleTypes.EmployeeAdmin,
  RoleTypes.ContentManager,
  RoleTypes.PartnerManager,
] as const;

export type InternalAdminRole = (typeof INTERNAL_ADMIN_ROLE_NAMES)[number];
