import { ForbiddenException, HttpException } from "@nestjs/common";
import { RoleTypes } from "@app/types/RoleTypes";
import { AdminUserAdminService } from "./admin-user-admin.service";

describe("AdminUserAdminService technical specialist boundary", () => {
  const userRepository = {
    findById: jest.fn().mockResolvedValue({ id: 9 }),
    findByIdWithCompanyEmployees: jest.fn(),
    softDelete: jest.fn(),
  };
  const service = new AdminUserAdminService(
    userRepository as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it("does not assign technical_specialist to a company-linked user", async () => {
    userRepository.findByIdWithCompanyEmployees.mockResolvedValue({
      id: 9,
      company_employee: { company_id: 4 },
    });

    await expect(
      service.update(9, { role: RoleTypes.TechnicalSpecialist }),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it("does not change the built-in administrator role", async () => {
    userRepository.findById.mockResolvedValueOnce({
      id: 143,
      email: "sancho97.2011@mail.ru",
    });

    await expect(
      service.update(143, { role: RoleTypes.EmployeeAdmin }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("does not archive the built-in administrator", async () => {
    userRepository.findById.mockResolvedValueOnce({
      id: 143,
      email: "sancho97.2011@mail.ru",
    });

    await expect(service.delete(143)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(userRepository.softDelete).not.toHaveBeenCalled();
  });
});
