import { RoleTypes } from "@app/types/RoleTypes";

export const SYSTEM_ROLE_NAMES = Object.freeze(Object.values(RoleTypes));

export const isSystemRoleName = (name: string): boolean =>
  SYSTEM_ROLE_NAMES.includes(name as RoleTypes);
