import { BadRequestException } from "@nestjs/common";
import { PermissionsService } from "./permissions.service";

describe("PermissionsService assignable admin access", () => {
  const permissionRepository = {
    find: jest.fn(),
  };
  const roleRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const service = new PermissionsService(
    permissionRepository as any,
    roleRepository as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it("preserves non-admin business permissions when admin access is saved", async () => {
    const businessPermission = { id: 1, name: "api.upload.write" };
    const oldAdminPermission = {
      id: 2,
      name: "system.admin-content.read",
    };
    const newAdminPermission = {
      id: 3,
      name: "system.admin-documents.read",
    };
    const role = {
      id: 7,
      name: "content_manager",
      permissions: [businessPermission, oldAdminPermission],
    };
    roleRepository.findOne.mockResolvedValue(role);
    permissionRepository.find.mockResolvedValue([newAdminPermission]);

    await service.setRolePermissions(7, [3]);

    expect(roleRepository.save).toHaveBeenCalledWith({
      ...role,
      permissions: [businessPermission, newAdminPermission],
    });
  });

  it("supports removing every assignable admin permission", async () => {
    const businessPermission = { id: 1, name: "api.upload.write" };
    const role = {
      id: 7,
      name: "content_manager",
      permissions: [
        businessPermission,
        { id: 2, name: "system.admin-content.read" },
      ],
    };
    roleRepository.findOne.mockResolvedValue(role);

    await service.setRolePermissions(7, []);

    expect(roleRepository.save).toHaveBeenCalledWith({
      ...role,
      permissions: [businessPermission],
    });
    expect(permissionRepository.find).not.toHaveBeenCalled();
  });

  it("rejects ids outside the assignable admin catalog", async () => {
    roleRepository.findOne.mockResolvedValue({
      id: 7,
      name: "content_manager",
      permissions: [],
    });
    permissionRepository.find.mockResolvedValue([]);

    await expect(service.setRolePermissions(7, [999])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(roleRepository.save).not.toHaveBeenCalled();
  });
});
