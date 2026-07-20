import { BadRequestException, ConflictException } from "@nestjs/common";
import { RoleTypes } from "@app/types/RoleTypes";
import { RoleService } from "./role.service";
import { SYSTEM_ROLE_NAMES } from "./system-role-names";

const role = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  name: "custom_reviewer",
  users: [],
  user_roles: [],
  permissions: [],
  deleted_at: null,
  ...overrides,
});

describe("RoleService lifecycle", () => {
  const repository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(data => data),
    save: jest.fn(async data => data),
    softRemove: jest.fn(),
    restore: jest.fn(),
  };
  const service = new RoleService(repository as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("treats every canonical RoleTypes value as an immutable system role", () => {
    expect(SYSTEM_ROLE_NAMES).toEqual(Object.values(RoleTypes));
  });

  it("does not delete or rename a system role", async () => {
    repository.findOne.mockResolvedValue(role({ name: RoleTypes.PartnerManager }));

    await expect(service.remove(10)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update(10, { name: "renamed" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.softRemove).not.toHaveBeenCalled();
  });

  it("checks both primary and secondary assignments before deletion", async () => {
    repository.findOne
      .mockResolvedValueOnce(role())
      .mockResolvedValueOnce(role({
        user_roles: [{ user_id: 42 }, { user_id: 42 }],
      }));

    await expect(service.remove(10)).rejects.toThrow(
      "Нельзя удалить роль, назначенную пользователям",
    );
    expect(repository.softRemove).not.toHaveBeenCalled();
  });

  it("soft-deletes an unassigned custom role", async () => {
    const customRole = role();
    repository.findOne.mockResolvedValue(customRole);

    await service.remove(10);

    expect(repository.softRemove).toHaveBeenCalledWith(customRole);
  });

  it("restores the same archived row", async () => {
    const archivedRole = role({ deleted_at: new Date("2026-07-17") });
    const restoredRole = role();
    repository.findOne
      .mockResolvedValueOnce(archivedRole)
      .mockResolvedValueOnce(restoredRole);

    await expect(service.restore(10)).resolves.toBe(restoredRole);
    expect(repository.restore).toHaveBeenCalledWith(10);
  });

  it("requires restoring an archived name instead of creating a duplicate", async () => {
    repository.findOne.mockResolvedValue(role({
      deleted_at: new Date("2026-07-17"),
    }));

    await expect(service.create({
      name: "custom_reviewer",
      description: "Reviewer",
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it("reports unique users across primary and secondary assignments", async () => {
    repository.find.mockResolvedValue([role({
      users: [{ id: 1 }],
      user_roles: [{ user_id: 1 }, { user_id: 2 }],
    })]);

    await expect(service.getRolesWithStats()).resolves.toEqual([
      expect.objectContaining({ users_count: 2, is_system: false }),
    ]);
  });
});
