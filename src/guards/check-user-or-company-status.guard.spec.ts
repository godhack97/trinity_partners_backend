import { ForbiddenException } from "@nestjs/common";
import { CompanyEmployeeStatus, CompanyStatus } from "@orm/entities";
import { RoleTypes } from "@app/types/RoleTypes";
import { CheckUserOrCompanyStatusGuard } from "./check-user-or-company-status.guard";

const context = {
  switchToHttp: () => ({
    getRequest: () => ({
      headers: { authorization: "Bearer smoke-token" },
    }),
  }),
} as any;

const userWithRoles = (
  primaryRole: RoleTypes,
  secondaryRoles: RoleTypes[] = [],
  extra: Record<string, unknown> = {},
) => ({
  role: { name: primaryRole },
  roles: secondaryRoles.map((name) => ({ name })),
  ...extra,
});

describe("CheckUserOrCompanyStatusGuard", () => {
  const findByTokenWithCompany = jest.fn();
  const guard = new CheckUserOrCompanyStatusGuard({
    findByTokenWithCompany,
  } as any);

  beforeEach(() => {
    findByTokenWithCompany.mockReset();
  });

  test.each([
    RoleTypes.SuperAdmin,
    RoleTypes.EmployeeAdmin,
    RoleTypes.ContentManager,
    RoleTypes.PartnerManager,
  ])("allows internal role %s without a company relation", async (role) => {
    findByTokenWithCompany.mockResolvedValue(userWithRoles(role));

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  test("honors an internal secondary role", async () => {
    findByTokenWithCompany.mockResolvedValue(
      userWithRoles(RoleTypes.Employee, [RoleTypes.ContentManager]),
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  test("returns a controlled forbidden error for an unbound employee", async () => {
    findByTokenWithCompany.mockResolvedValue(userWithRoles(RoleTypes.Employee));

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException("Пользователь не привязан к компании!"),
    );
  });

  test("allows an accepted company employee", async () => {
    findByTokenWithCompany.mockResolvedValue(
      userWithRoles(RoleTypes.Employee, [], {
        company_employee: {
          status: CompanyEmployeeStatus.Accept,
          company: { status: CompanyStatus.Accept },
        },
      }),
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
