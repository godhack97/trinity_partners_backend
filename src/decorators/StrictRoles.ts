import { SetMetadata } from "@nestjs/common";

export const STRICT_ROLES = "strict_roles";
export const StrictRoles = (roles: string[]) => SetMetadata(STRICT_ROLES, roles);
