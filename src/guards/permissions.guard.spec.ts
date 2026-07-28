import { ForbiddenException } from "@nestjs/common";
import { PermissionsGuard } from "./permissions.guard";
import { RoleTypes } from "@app/types/RoleTypes";

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
  it("не дает staff права базовой роли employee, если обе роли есть у пользователя", () => {
    const guard = new PermissionsGuard({
      getAllAndOverride: jest.fn().mockReturnValue(["api.deals.read"]),
    } as any);

    const user = {
      roles: [
        role(RoleTypes.Employee, ["api.deals.read", "api.configurator.read"]),
        role(RoleTypes.Staff, ["api.profile.read"]),
      ],
    };

    expect(() => guard.canActivate(makeContext(user))).toThrow(
      ForbiddenException,
    );
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
});
