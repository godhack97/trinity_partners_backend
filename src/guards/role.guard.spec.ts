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
    getAllAndOverride: jest.fn((key) =>
      key === "accepted_roles" ? [RoleTypes.SuperAdmin] : undefined,
    ),
  };
  const userRepository = {
    findByIdWithPermissions: jest.fn(),
  };
  const guard = new RoleGuard(userRepository as any, reflector as any);

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.getAllAndOverride.mockImplementation((key) =>
      key === "accepted_roles" ? [RoleTypes.SuperAdmin] : undefined,
    );
  });

  it("does not let configurable permissions bypass a strict super-admin endpoint", async () => {
    reflector.getAllAndOverride.mockImplementation((key) =>
      key === "accepted_roles" || key === "strict_roles"
        ? [RoleTypes.SuperAdmin]
        : undefined,
    );
    userRepository.findByIdWithPermissions.mockResolvedValue({
      role: role(RoleTypes.EmployeeAdmin, ["system.admin-employees.write"]),
      roles: [],
    });

    await expect(
      guard.canActivate(makeContext("/api/admin/user/all/12", "PATCH")),
    ).rejects.toBeInstanceOf(HttpException);
  });

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
