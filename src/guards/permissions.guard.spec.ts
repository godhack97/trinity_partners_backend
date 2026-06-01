import { ForbiddenException } from "@nestjs/common";
import { PermissionsGuard } from "./permissions.guard";
import { RoleTypes } from "@app/types/RoleTypes";

const makeContext = (user: any) =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
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
});
