import { RoleTypes } from "../types/RoleTypes";

export const ADMIN_USER_IMPERSONATION_PERMISSION =
  "system.admin-users.impersonate";

export const canImpersonateUsers = (user: any): boolean => {
  const roles = [user?.role, ...(user?.roles || [])].filter(Boolean);

  return (
    roles.some((role) => role.name === RoleTypes.SuperAdmin) ||
    roles.some((role) =>
      (role.permissions || []).some(
        (permission) =>
          permission.name === ADMIN_USER_IMPERSONATION_PERMISSION,
      ),
    )
  );
};
