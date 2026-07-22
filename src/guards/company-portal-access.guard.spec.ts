import { ForbiddenException } from "@nestjs/common";
import { RoleTypes } from "@app/types/RoleTypes";
import { CompanyStatus } from "@orm/entities";
import { CompanyPortalAccessGuard } from "./company-portal-access.guard";

const context = (user: any) =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as any;

describe("CompanyPortalAccessGuard", () => {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
  const userRepository = { findByIdWithPermissions: jest.fn() };
  const guard = new CompanyPortalAccessGuard(
    reflector as any,
    userRepository as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue(false);
  });

  it("blocks a company account whose company is pending or suspended", async () => {
    userRepository.findByIdWithPermissions.mockResolvedValue({
      id: 7,
      lazy_owner_company: Promise.resolve({ status: CompanyStatus.Pending }),
    });

    await expect(
      guard.canActivate(
        context({ id: 7, role: { name: RoleTypes.Partner }, roles: [] }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows an active company account", async () => {
    userRepository.findByIdWithPermissions.mockResolvedValue({
      id: 7,
      lazy_owner_company: Promise.resolve({ status: CompanyStatus.Accept }),
    });

    await expect(
      guard.canActivate(
        context({ id: 7, role: { name: RoleTypes.Partner }, roles: [] }),
      ),
    ).resolves.toBe(true);
  });

  it("does not apply company restrictions to internal technical specialists", async () => {
    await expect(
      guard.canActivate(
        context({
          id: 8,
          role: { name: RoleTypes.TechnicalSpecialist },
          roles: [],
        }),
      ),
    ).resolves.toBe(true);
    expect(userRepository.findByIdWithPermissions).not.toHaveBeenCalled();
  });

  it("allows explicitly whitelisted restricted-state endpoints", async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    await expect(
      guard.canActivate(
        context({ id: 7, role: { name: RoleTypes.Partner }, roles: [] }),
      ),
    ).resolves.toBe(true);
    expect(userRepository.findByIdWithPermissions).not.toHaveBeenCalled();
  });
});
