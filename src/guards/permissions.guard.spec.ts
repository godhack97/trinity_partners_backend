import { ForbiddenException } from "@nestjs/common";
import { PermissionsGuard } from "./permissions.guard";
import { RoleTypes } from "@app/types/RoleTypes";
import { STRICT_PERMISSIONS } from "@decorators/StrictPermissions";

const makeContext = (user: any, path = "", method = "GET") =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user, originalUrl: path, method }),
    }),
  }) as any;

const role = (name: RoleTypes, permissions: string[] = []) => ({
  name,
  permissions: permissions.map((permissionName) => ({ name: permissionName })),
});

describe("PermissionsGuard business roles", () => {
  it("объединяет права всех ролей пользователя", () => {
    const guard = new PermissionsGuard({
      getAllAndOverride: jest.fn().mockReturnValue(["api.deals.read"]),
    } as any);

    const user = {
      roles: [
        role(RoleTypes.Employee, ["api.deals.read", "api.configurator.read"]),
        role(RoleTypes.Staff, ["api.profile.read"]),
      ],
    };

    expect(guard.canActivate(makeContext(user))).toBe(true);
  });

  it("учитывает права основной роли вместе с дополнительными", () => {
    const guard = new PermissionsGuard({
      getAllAndOverride: jest.fn().mockReturnValue(["api.deals.write"]),
    } as any);

    const user = {
      role: role(RoleTypes.Employee, ["api.deals.write"]),
      roles: [role(RoleTypes.Staff, ["api.profile.read"])],
    };

    expect(guard.canActivate(makeContext(user))).toBe(true);
  });

  it("оставляет права выбранной бизнес-роли", () => {
    const guard = new PermissionsGuard({
      getAllAndOverride: jest.fn().mockReturnValue(["api.deals.read"]),
    } as any);

    const user = {
      roles: [
        role(RoleTypes.Employee, ["api.profile.read"]),
        role(RoleTypes.SalesManager, ["api.deals.read"]),
      ],
    };

    expect(guard.canActivate(makeContext(user))).toBe(true);
  });

  it("запрещает прямой запрос к разделу партнерки без права", () => {
    const guard = new PermissionsGuard({
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as any);
    const user = {
      roles: [role(RoleTypes.Staff, ["api.portal-dashboard.read"])],
    };

    expect(() =>
      guard.canActivate(
        makeContext(user, "/api/configurator-drafts", "GET"),
      ),
    ).toThrow(ForbiddenException);
  });

  it("разрешает прямой запрос к разделу партнерки с нужным правом", () => {
    const guard = new PermissionsGuard({
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as any);
    const user = {
      roles: [
        role(RoleTypes.SalesManager, ["api.portal-configurator.write"]),
      ],
    };

    expect(
      guard.canActivate(
        makeContext(user, "/api/configurator-drafts/42", "PUT"),
      ),
    ).toBe(true);
  });

  it("не заменяет явное право общим правом раздела", () => {
    const guard = new PermissionsGuard({
      getAllAndOverride: jest
        .fn()
        .mockImplementation((key) =>
          key === STRICT_PERMISSIONS
            ? ["system.admin-users.impersonate"]
            : key === "permissions"
              ? ["system.admin-users.impersonate"]
              : undefined,
        ),
    } as any);
    const user = {
      role: role(RoleTypes.ContentManager, ["system.admin-employees.write"]),
    };

    expect(() =>
      guard.canActivate(
        makeContext(user, "/api/admin/user/all/42/impersonate", "POST"),
      ),
    ).toThrow(ForbiddenException);
  });

  it("принимает явное право из дополнительной роли", () => {
    const guard = new PermissionsGuard({
      getAllAndOverride: jest
        .fn()
        .mockImplementation((key) =>
          key === STRICT_PERMISSIONS
            ? ["system.admin-users.impersonate"]
            : key === "permissions"
              ? ["system.admin-users.impersonate"]
              : undefined,
        ),
    } as any);
    const user = {
      role: role(RoleTypes.ContentManager, []),
      roles: [
        role(RoleTypes.EmployeeAdmin, ["system.admin-users.impersonate"]),
      ],
    };

    expect(
      guard.canActivate(
        makeContext(user, "/api/admin/user/all/42/impersonate", "POST"),
      ),
    ).toBe(true);
  });

  it("сохраняет совместимость обычного права с правом раздела", () => {
    const guard = new PermissionsGuard({
      getAllAndOverride: jest
        .fn()
        .mockImplementation((key) =>
          key === "permissions" ? ["api.roles.write"] : undefined,
        ),
    } as any);
    const user = {
      role: role(RoleTypes.ContentManager, ["system.admin-settings.write"]),
    };

    expect(
      guard.canActivate(makeContext(user, "/api/role/42", "PATCH")),
    ).toBe(true);
  });
});
