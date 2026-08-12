import { BadRequestException, HttpException } from "@nestjs/common";
import { CompanyService } from "./company.service";
import { RoleTypes } from "@app/types/RoleTypes";
import { CompanyEmployeeStatus } from "@orm/entities";

const makeService = (overrides: Record<string, any> = {}) => {
  const userRepository = {
    findByIdWithCompanyEmployees: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    ...overrides.userRepository,
  };
  const authTokenService = {
    extractToken: jest.fn().mockReturnValue("token"),
    getUserRole: jest.fn().mockResolvedValue({
      role: RoleTypes.Employee,
      roles: [RoleTypes.CompanyAdmin],
      companyId: 10,
    }),
    ...overrides.authTokenService,
  };
  const companyRepository = {
    ...overrides.companyRepository,
  };
  const companyEmployeeRepository = {
    findAllCompanyEmployeesWithUsersAndInfo: jest.fn().mockResolvedValue([]),
    findCompanyEmployeesByCompanyId: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockImplementation(async ({ where }: any) =>
      where.company_id === 10 &&
      where.employee_id === 20 &&
      where.status === CompanyEmployeeStatus.Accept
        ? {
            id: 30,
            company_id: 10,
            employee_id: 20,
            status: CompanyEmployeeStatus.Accept,
          }
        : null,
    ),
    findCompanyEmployeeByEmployeeId: jest
      .fn()
      .mockResolvedValue({ company_id: 10 }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    ...overrides.companyEmployeeRepository,
  };
  const userInfoRepository = {
    ...overrides.userInfoRepository,
  };
  const roleRepository = {
    findByRole: jest.fn((roleName: RoleTypes) =>
      Promise.resolve({ id: roleName === RoleTypes.CompanyAdmin ? 6 : 7, name: roleName }),
    ),
    ...overrides.roleRepository,
  };
  const emailConfirmerService = {
    emailSend: jest.fn().mockResolvedValue({}),
    ...overrides.emailConfirmerService,
  };
  const notificationService = {
    send: jest.fn().mockResolvedValue({}),
    ...overrides.notificationService,
  };
  const userRoleRepository = {
    delete: jest.fn().mockResolvedValue({}),
    save: jest.fn().mockResolvedValue({}),
    ...overrides.userRoleRepository,
  };
  return {
    service: new CompanyService(
      userRepository as any,
      authTokenService as any,
      companyRepository as any,
      companyEmployeeRepository as any,
      userInfoRepository as any,
      roleRepository as any,
      emailConfirmerService as any,
      notificationService as any,
      userRoleRepository as any,
    ),
    mocks: {
      userRepository,
      authTokenService,
      companyEmployeeRepository,
      roleRepository,
      userRoleRepository,
      emailConfirmerService,
      notificationService,
    },
  };
};

const employee = (roles: RoleTypes[] = [RoleTypes.SalesManager]) =>
  ({
    id: 20,
    email: "employee@example.test",
    role: { name: RoleTypes.Employee },
    roles: roles.map((name) => ({ name })),
    company_employee: { id: 30, company_id: 10 },
  }) as any;

describe("CompanyService business roles", () => {
  it("разрешает администратору компании смотреть сотрудников своей компании", async () => {
    const { service, mocks } = makeService({
      companyEmployeeRepository: {
        findCompanyEmployeesByCompanyId: jest.fn().mockResolvedValue([
          { employee_id: 20 },
        ]),
      },
    });

    await expect(service.getCompanyEmployees({} as any)).resolves.toEqual([
      { employee_id: 20 },
    ]);
    expect(
      mocks.companyEmployeeRepository.findCompanyEmployeesByCompanyId,
    ).toHaveBeenCalledWith(10);
  });

  it("запрещает менеджеру продаж управление списком сотрудников", async () => {
    const { service } = makeService({
      authTokenService: {
        extractToken: jest.fn().mockReturnValue("token"),
        getUserRole: jest.fn().mockResolvedValue({
          role: RoleTypes.Employee,
          roles: [RoleTypes.SalesManager],
          companyId: 10,
        }),
      },
    });

    await expect(service.getCompanyEmployees({} as any)).rejects.toBeInstanceOf(
      HttpException,
    );
  });

  it("назначает сотрудника администратором компании", async () => {
    const { service, mocks } = makeService({
      userRepository: {
        findByIdWithCompanyEmployees: jest.fn().mockResolvedValue(employee()),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      },
    });

    await service.changeStatusEmployeeAdmin({} as any, 20, {
      isEmployeeAdmin: true,
    });

    expect(mocks.roleRepository.findByRole).toHaveBeenCalledWith(
      RoleTypes.CompanyAdmin,
    );
    expect(mocks.userRoleRepository.delete).toHaveBeenCalledWith({
      user_id: 20,
    });
    expect(mocks.userRoleRepository.save).toHaveBeenCalledWith({
      user_id: 20,
      role_id: 6,
    });
  });

  it("разрешает понижение администратора, если в компании есть другой активный администратор", async () => {
    const { service, mocks } = makeService({
      userRepository: {
        findByIdWithCompanyEmployees: jest
          .fn()
          .mockResolvedValue(employee([RoleTypes.CompanyAdmin])),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      },
      companyEmployeeRepository: {
        findCompanyEmployeeByEmployeeId: jest
          .fn()
          .mockResolvedValue({ company_id: 10 }),
        findCompanyEmployeesByCompanyId: jest.fn().mockResolvedValue([
          {
            status: CompanyEmployeeStatus.Accept,
            employee_id: 21,
            employee: { role: { name: RoleTypes.Employee }, roles: [{ name: RoleTypes.CompanyAdmin }] },
          },
        ]),
      },
    });

    await service.changeStatusEmployeeAdmin({} as any, 20, {
      isEmployeeAdmin: false,
    });

    expect(mocks.roleRepository.findByRole).toHaveBeenCalledWith(
      RoleTypes.SalesManager,
    );
  });

  it("запрещает понижение последнего активного администратора компании", async () => {
    const { service } = makeService({
      userRepository: {
        findByIdWithCompanyEmployees: jest
          .fn()
          .mockResolvedValue(employee([RoleTypes.CompanyAdmin])),
      },
      companyEmployeeRepository: {
        findCompanyEmployeeByEmployeeId: jest
          .fn()
          .mockResolvedValue({ company_id: 10 }),
        findCompanyEmployeesByCompanyId: jest.fn().mockResolvedValue([]),
      },
    });

    await expect(
      service.changeStatusEmployeeAdmin({} as any, 20, {
        isEmployeeAdmin: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("запрещает удаление последнего активного администратора компании", async () => {
    const { service } = makeService({
      userRepository: {
        findByIdWithCompanyEmployees: jest
          .fn()
          .mockResolvedValue(employee([RoleTypes.CompanyAdmin])),
      },
      companyEmployeeRepository: {
        findCompanyEmployeeByEmployeeId: jest
          .fn()
          .mockResolvedValue({ company_id: 10 }),
        findCompanyEmployeesByCompanyId: jest.fn().mockResolvedValue([]),
      },
    });

    await expect(service.removeEmployee({} as any, 20)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("запрещает менять роль сотрудника из другой компании по прямому id", async () => {
    const { service, mocks } = makeService({
      userRepository: {
        findByIdWithCompanyEmployees: jest.fn().mockResolvedValue(employee()),
      },
      companyEmployeeRepository: {
        findOne: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.changeStatusEmployeeAdmin({} as any, 20, {
        isEmployeeAdmin: true,
      }),
    ).rejects.toMatchObject({ status: 403 });

    expect(
      mocks.userRepository.findByIdWithCompanyEmployees,
    ).not.toHaveBeenCalled();
    expect(mocks.userRepository.update).not.toHaveBeenCalled();
  });

  it("запрещает удалять заблокированного участника даже из своей компании", async () => {
    const { service, mocks } = makeService({
      userRepository: {
        findByIdWithCompanyEmployees: jest.fn().mockResolvedValue(employee()),
      },
      companyEmployeeRepository: {
        findOne: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(service.removeEmployee({} as any, 20)).rejects.toMatchObject({
      status: 403,
    });

    expect(mocks.userRepository.update).not.toHaveBeenCalled();
    expect(mocks.companyEmployeeRepository.update).not.toHaveBeenCalled();
  });

  it("запрещает удалять сотрудника другой компании по прямому id", async () => {
    const { service, mocks } = makeService({
      userRepository: {
        findByIdWithCompanyEmployees: jest.fn().mockResolvedValue(employee()),
      },
      companyEmployeeRepository: {
        findOne: jest.fn().mockImplementation(async ({ where }: any) =>
          where.company_id === 11
            ? {
                id: 31,
                company_id: 11,
                employee_id: 20,
                status: CompanyEmployeeStatus.Accept,
              }
            : null,
        ),
      },
    });

    await expect(service.removeEmployee({} as any, 20)).rejects.toMatchObject({
      status: 403,
    });

    expect(
      mocks.userRepository.findByIdWithCompanyEmployees,
    ).not.toHaveBeenCalled();
    expect(mocks.companyEmployeeRepository.update).not.toHaveBeenCalled();
    expect(mocks.emailConfirmerService.emailSend).not.toHaveBeenCalled();
  });

  it("блокирует сотрудника без переназначения авторства его сделок", async () => {
    const { service, mocks } = makeService({
      userRepository: {
        findByIdWithCompanyEmployees: jest.fn().mockResolvedValue(employee()),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      },
      companyRepository: {
        findOne: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(service.removeEmployee({} as any, 20)).resolves.toEqual({
      message: "Cотрудник c 20 был успешно удален",
      succes: true,
    });

    expect(mocks.userRepository.update).toHaveBeenCalledWith(20, {
      role: expect.objectContaining({ name: RoleTypes.Employee }),
    });
    expect(mocks.companyEmployeeRepository.update).toHaveBeenCalledWith(30, {
      status: CompanyEmployeeStatus.Blocked,
    });
    expect(mocks.notificationService.send).not.toHaveBeenCalled();
  });
});
