import { RoleTypes } from "@app/types/RoleTypes";

type RoleLike = { name?: string | null } | null | undefined;

export interface UserWithRoles {
  role?: RoleLike;
  roles?: RoleLike[] | null;
  user_roles?: Array<{ role?: RoleLike } | null | undefined> | null;
}

export function getEffectiveUserRoleNames(user?: UserWithRoles | null): string[] {
  const roleNames = new Set<string>();
  const addRole = (role?: RoleLike) => {
    if (role?.name) roleNames.add(role.name);
  };

  addRole(user?.role);
  for (const role of user?.roles || []) addRole(role);
  for (const userRole of user?.user_roles || []) addRole(userRole?.role);

  return [...roleNames];
}

export function hasAnyUserRole(
  user: UserWithRoles | null | undefined,
  expectedRoles: RoleTypes[],
): boolean {
  const roleNames = getEffectiveUserRoleNames(user);
  return expectedRoles.some((roleName) => roleNames.includes(roleName));
}
