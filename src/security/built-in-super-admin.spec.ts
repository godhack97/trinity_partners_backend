import {
  BUILT_IN_SUPER_ADMIN_EMAIL,
  isBuiltInSuperAdminEmail,
} from "./built-in-super-admin";

describe("built-in super administrator identity", () => {
  it("matches the protected email case-insensitively", () => {
    expect(isBuiltInSuperAdminEmail(`  ${BUILT_IN_SUPER_ADMIN_EMAIL.toUpperCase()}  `))
      .toBe(true);
  });

  it("does not grant protection to other users", () => {
    expect(isBuiltInSuperAdminEmail("admin@example.test")).toBe(false);
    expect(isBuiltInSuperAdminEmail(null)).toBe(false);
  });
});
