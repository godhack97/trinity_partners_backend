import { HttpException } from "@nestjs/common";
import { RoleGuard } from "./role.guard";
import { RoleTypes } from "@app/types/RoleTypes";

const makeContext = (path: string, method = "GET") =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        auth_user: { id: 7 },
        originalUrl: path,
        method,
      }),
    }),
  }) as any;

const role = (name: string, permissions: string[] = []) => ({
  name,
  permissions: permissions.map((permissionName) => ({
    name: permissionName,
  })),
});

describe("RoleGuard configurable admin sections", () => {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue([RoleTypes.SuperAdmin]),
  };
  const userRepository = {
    findByIdWithPermissions: jest.fn(),
  };
  const guard = new RoleGuard(userRepository as any, reflector as any);

  beforeEach(() => jest.clearAllMocks());

  it("allows an internal role when the section permission is assigned", async () => {
    userRepository.findByIdWithPermissions.mockResolvedValue({
      role: role(RoleTypes.ContentManager, [
        "system.admin-configurator.read",
      ]),
      roles: [],
    });

    await expect(
      guard.canActivate(makeContext("/api/admin/configurator/component")),
    ).resolves.toBe(true);
  });

  it.each([
    ["GET", "system.admin-content.read"],
    ["POST", "system.admin-content.write"],
    ["DELETE", "system.admin-content.remove"],
  ])("maps %s requests to %s", async (method, permission) => {
    userRepository.findByIdWithPermissions.mockResolvedValue({
      role: role(RoleTypes.ContentManager, [permission]),
      roles: [],
    });

    await expect(
      guard.canActivate(
        makeContext("/api/admin/important-alerts/12", method),
      ),
    ).resolves.toBe(true);
  });

  it("does not allow write operations with read-only access", async () => {
    userRepository.findByIdWithPermissions.mockResolvedValue({
      role: role(RoleTypes.ContentManager, ["system.admin-content.read"]),
      roles: [],
    });

    await expect(
      guard.canActivate(
        makeContext("/api/admin/important-alerts", "POST"),
      ),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it("denies a formerly hardcoded role after its section permission is removed", async () => {
    userRepository.findByIdWithPermissions.mockResolvedValue({
      role: role(RoleTypes.ContentManager),
      roles: [],
    });

    await expect(
      guard.canActivate(makeContext("/api/admin/important-alerts")),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it("always allows the super administrator", async () => {
    userRepository.findByIdWithPermissions.mockResolvedValue({
      role: role(RoleTypes.SuperAdmin),
      roles: [],
    });

    await expect(
      guard.canActivate(makeContext("/api/admin/user/admin")),
    ).resolves.toBe(true);
  });
});
