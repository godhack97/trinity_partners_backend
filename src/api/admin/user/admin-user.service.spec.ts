import { BadRequestException, ForbiddenException } from "@nestjs/common";
import {
  CompanyEmployeeStatus,
  UserEntity,
  UserIdentityEntity,
} from "@orm/entities";
import { AdminUserService } from "./admin-user.service";

const createQueryBuilder = () => {
  const qb: Record<string, jest.Mock> = {};
  [
    "innerJoinAndSelect",
    "innerJoin",
    "leftJoinAndSelect",
    "leftJoinAndMapOne",
    "withDeleted",
    "where",
    "distinct",
    "andWhere",
    "orderBy",
    "skip",
    "take",
  ].forEach((method) => {
    qb[method] = jest.fn().mockReturnValue(qb);
  });
  qb.getManyAndCount = jest.fn().mockResolvedValue([[{ id: 10 }], 11]);
  qb.getCount = jest.fn().mockResolvedValue(11);
  return qb;
};

describe("AdminUserService", () => {
  const userRepository = {
    createQueryBuilder: jest.fn(),
    findByIdWithCompanyEmployees: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const companyEmployeeRepository = {
    createQueryBuilder: jest.fn(),
    findCompanyEmployeeByEmployeeId: jest.fn(),
    update: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(),
    getRepository: jest.fn(),
  };

  const service = new AdminUserService(
    userRepository as any,
    companyEmployeeRepository as any,
    dataSource as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("counts the same company employee rows shown by the unfiltered screen", async () => {
    const qb = createQueryBuilder();
    companyEmployeeRepository.createQueryBuilder.mockReturnValue(qb);

    await expect(service.getCount()).resolves.toBe(11);

    expect(companyEmployeeRepository.createQueryBuilder).toHaveBeenCalledWith("ce");
    expect(qb.innerJoin).toHaveBeenCalledWith("ce.company", "company");
    expect(qb.where).toHaveBeenCalledWith("company.owner_id <> ce.employee_id");
  });

  it("returns only company employees, excluding company owners, with filters and pagination", async () => {
    const qb = createQueryBuilder();
    companyEmployeeRepository.createQueryBuilder.mockReturnValue(qb);

    const result = await service.find({
      current_page: 2,
      limit: 5,
      company_id: 7,
      role_name: "sales_manager" as any,
      status: CompanyEmployeeStatus.Blocked,
      is_activated: false,
      search: "Иван",
    });

    expect(qb.where).toHaveBeenCalledWith("company.owner_id <> ce.employee_id");
    expect(qb.andWhere).toHaveBeenCalledWith(
      "ce.company_id = :company_id",
      { company_id: 7 },
    );
    expect(qb.andWhere).toHaveBeenCalledWith("ce.status = :status", {
      status: CompanyEmployeeStatus.Blocked,
    });
    expect(qb.andWhere).toHaveBeenCalledWith(
      "employee.is_activated = :is_activated",
      { is_activated: false },
    );
    expect(qb.skip).toHaveBeenCalledWith(5);
    expect(qb.take).toHaveBeenCalledWith(5);
    expect(result).toEqual({
      current_page: 2,
      limit: 5,
      total: 11,
      pages_count: 3,
      data: [{ id: 10 }],
    });
  });

  it.each([CompanyEmployeeStatus.Blocked, CompanyEmployeeStatus.Deleted])(
    "restores an employee from %s",
    async (status) => {
      userRepository.findByIdWithCompanyEmployees.mockResolvedValue({ id: 12 });
      companyEmployeeRepository.findCompanyEmployeeByEmployeeId
        .mockResolvedValueOnce({ id: 21, employee_id: 12, status })
        .mockResolvedValueOnce({
          id: 21,
          employee_id: 12,
          status: CompanyEmployeeStatus.Accept,
        });

      await service.restoreCompanyEmployee(12);

      expect(companyEmployeeRepository.update).toHaveBeenCalledWith(21, {
        status: CompanyEmployeeStatus.Accept,
      });
      expect(userRepository.update).toHaveBeenCalledWith(12, {
        is_activated: true,
      });
    },
  );

  it("does not bypass an unfinished approval workflow through restore", async () => {
    userRepository.findByIdWithCompanyEmployees.mockResolvedValue({ id: 12 });
    companyEmployeeRepository.findCompanyEmployeeByEmployeeId.mockResolvedValue({
      id: 21,
      employee_id: 12,
      status: CompanyEmployeeStatus.TrinityPending,
    });

    await expect(service.restoreCompanyEmployee(12)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(companyEmployeeRepository.update).not.toHaveBeenCalled();
  });

  it("updates activation and email confirmation for a company employee", async () => {
    companyEmployeeRepository.findCompanyEmployeeByEmployeeId
      .mockResolvedValueOnce({ id: 21, employee_id: 12 })
      .mockResolvedValueOnce({ id: 21, employee_id: 12 });

    await service.updateCompanyEmployee(12, {
      is_activated: false,
      email_confirmed: true,
    });

    expect(userRepository.update).toHaveBeenCalledWith(12, {
      is_activated: false,
      email_confirmed: true,
    });
  });

  it("does not update a user outside the company employee scope", async () => {
    companyEmployeeRepository.findCompanyEmployeeByEmployeeId.mockResolvedValue(
      null,
    );

    await expect(
      service.updateCompanyEmployee(12, { is_activated: true }),
    ).rejects.toMatchObject({ status: 404 });
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it("does not disable or rename the built-in administrator", async () => {
    userRepository.findOne.mockResolvedValue({
      id: 143,
      email: "sancho97.2011@mail.ru",
      deleted_at: null,
    });

    await expect(
      service.updateAnyUser(143, {
        email: "renamed@example.test",
        is_activated: false,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it("does not reset the built-in administrator password", async () => {
    userRepository.findOne.mockResolvedValue({
      id: 143,
      email: "sancho97.2011@mail.ru",
      deleted_at: null,
    });

    await expect(service.resetPassword(143)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it("shows only archived users when the archive filter is selected", async () => {
    const qb = createQueryBuilder();
    userRepository.createQueryBuilder.mockReturnValue(qb);

    await service.findAllUsers({ deletion_state: "deleted" });

    expect(qb.withDeleted).toHaveBeenCalled();
    expect(qb.andWhere).toHaveBeenCalledWith("user.deleted_at IS NOT NULL");
  });

  it("allows permanent deletion only to the built-in administrator", async () => {
    await expect(
      service.permanentlyDeleteAnyUser(12, {
        id: 8,
        email: "another-admin@example.test",
      } as UserEntity),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(userRepository.findOne).not.toHaveBeenCalled();
  });

  it("physically removes an archived account while keeping its identity", async () => {
    userRepository.findOne.mockResolvedValue({
      id: 12,
      email: "history@example.test",
      deleted_at: new Date(),
      user_info: {
        first_name: "История",
        last_name: "Пользователя",
        phone: "+79990000000",
        job_title: "Архитектор",
      },
      role: { id: 2, name: "partner", display_name: "Партнёр" },
      user_roles: [],
    });
    const identityRepository = { update: jest.fn().mockResolvedValue({ affected: 1 }) };
    const accountRepository = { delete: jest.fn().mockResolvedValue({ affected: 1 }) };
    const manager = {
      query: jest.fn().mockResolvedValue({ affectedRows: 1 }),
      getRepository: jest.fn((entity) => {
        if (entity === UserIdentityEntity) return identityRepository;
        if (entity === UserEntity) return accountRepository;
        throw new Error("Unexpected repository");
      }),
    };
    dataSource.transaction.mockImplementation((callback) => callback(manager));

    await expect(
      service.permanentlyDeleteAnyUser(12, {
        id: 143,
        email: "sancho97.2011@mail.ru",
      } as UserEntity),
    ).resolves.toMatchObject({ success: true });

    expect(identityRepository.update).toHaveBeenCalledWith(
      12,
      expect.objectContaining({
        email: "history@example.test",
        first_name: "История",
        permanently_deleted_at: expect.any(Date),
        deleted_by_user_id: 143,
      }),
    );
    expect(accountRepository.delete).toHaveBeenCalledWith(12);
  });
});
