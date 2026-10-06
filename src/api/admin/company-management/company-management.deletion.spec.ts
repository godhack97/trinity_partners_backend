import { ForbiddenException } from "@nestjs/common";
import { RoleTypes } from "@app/types/RoleTypes";
import {
  CompanyEmployeeEntity,
  CompanyEmployeeStatus,
  CompanyEntity,
  CompanyIdentityEntity,
  CompanyLifecycleAction,
  CompanyStatus,
  CompanyStatusHistoryEntity,
} from "@orm/entities";
import { CompanyManagementService } from "./company-management.service";

const archivedCompany = {
  id: 10,
  owner_id: 90,
  name: "ООО История",
  inn: "7700000000",
  partnership_type: "integrator",
  status: CompanyStatus.Accept,
  deleted_at: new Date(),
} as any;

const actor = (email: string) =>
  ({
    id: 143,
    email,
    role: { name: RoleTypes.SuperAdmin },
    roles: [],
  }) as any;

describe("CompanyManagementService deletion", () => {
  it("allows permanent deletion only to the built-in administrator", async () => {
    const service = new CompanyManagementService(
      {} as any,
      {} as any,
      {} as any,
      { transaction: jest.fn() } as any,
      {} as any,
    );
    const findCompany = jest.spyOn(service as any, "findCompany");

    await expect(
      service.permanentlyDelete(10, actor("another-admin@example.test")),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(findCompany).not.toHaveBeenCalled();
  });

  it("physically removes only the operational company and keeps history", async () => {
    const identityRepository = { update: jest.fn().mockResolvedValue({ affected: 1 }) };
    const historyRepository = { save: jest.fn().mockResolvedValue({ id: 88 }) };
    const employeeRepository = { update: jest.fn().mockResolvedValue({ affected: 2 }) };
    const companyRepository = { delete: jest.fn().mockResolvedValue({ affected: 1 }) };
    const manager = {
      query: jest.fn().mockResolvedValue({ affectedRows: 1 }),
      getRepository: jest.fn((entity) => {
        if (entity === CompanyIdentityEntity) return identityRepository;
        if (entity === CompanyStatusHistoryEntity) return historyRepository;
        if (entity === CompanyEmployeeEntity) return employeeRepository;
        if (entity === CompanyEntity) return companyRepository;
        throw new Error("Unexpected repository");
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    const service = new CompanyManagementService(
      {} as any,
      {} as any,
      {} as any,
      dataSource as any,
      {} as any,
    );
    jest.spyOn(service as any, "findCompany").mockResolvedValue(archivedCompany);

    await expect(
      service.permanentlyDelete(10, actor("sancho97.2011@mail.ru")),
    ).resolves.toMatchObject({ success: true });

    expect(identityRepository.update).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        name: "ООО История",
        permanently_deleted_at: expect.any(Date),
        deleted_by_user_id: 143,
      }),
    );
    expect(historyRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ action: CompanyLifecycleAction.PermanentlyDeleted }),
    );
    expect(employeeRepository.update).toHaveBeenCalledWith(
      { company_id: 10 },
      { status: CompanyEmployeeStatus.Deleted },
    );
    expect(companyRepository.delete).toHaveBeenCalledWith(10);
  });
});
