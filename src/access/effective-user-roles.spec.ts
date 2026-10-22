import { RoleTypes } from "@app/types/RoleTypes";
import {
  getEffectiveUserRoleNames,
  hasAnyUserRole,
} from "./effective-user-roles";

describe("effective user roles", () => {
  it("unions the primary, exposed and relation-backed roles", () => {
    const user = {
      role: { name: RoleTypes.SuperAdmin },
      roles: [{ name: RoleTypes.Employee }],
      user_roles: [{ role: { name: RoleTypes.SalesManager } }],
    };

    expect(getEffectiveUserRoleNames(user)).toEqual([
      RoleTypes.SuperAdmin,
      RoleTypes.Employee,
      RoleTypes.SalesManager,
    ]);
    expect(hasAnyUserRole(user, [RoleTypes.Employee])).toBe(true);
  });

  it("deduplicates a role present in multiple representations", () => {
    expect(
      getEffectiveUserRoleNames({
        role: { name: RoleTypes.Employee },
        roles: [{ name: RoleTypes.Employee }],
      }),
    ).toEqual([RoleTypes.Employee]);
  });
});
