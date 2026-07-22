import { HttpException } from "@nestjs/common";
import { RoleTypes } from "@app/types/RoleTypes";
import { AdminUserAdminService } from "./admin-user-admin.service";

describe("AdminUserAdminService technical specialist boundary", () => {
  const userRepository = {
    findById: jest.fn().mockResolvedValue({ id: 9 }),
    findByIdWithCompanyEmployees: jest.fn(),
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
});
