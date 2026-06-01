import { UserService } from "./user.service";
import { RoleTypes } from "@app/types/RoleTypes";

const makeService = (overrides: Record<string, any> = {}) => {
  const forbiddenInnRepository = {
    findByInn: jest.fn().mockResolvedValue(null),
    ...overrides.forbiddenInnRepository,
  };
  const userRepository = {
    findByEmail: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue({ id: 101, email: "user@test.local" }),
    createQueryBuilder: jest.fn(() => ({
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
    findByIdWithUserInfo: jest.fn().mockResolvedValue({
      id: 1,
      email: "owner@test.local",
      user_info: { first_name: "Owner" },
    }),
    ...overrides.userRepository,
  };
  const userInfoRepository = {
    findOneBy: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue({}),
    ...overrides.userInfoRepository,
  };
  const roleRepository = {
    getEmployee: jest.fn().mockResolvedValue({ id: 2, name: RoleTypes.Employee }),
    getPartner: jest.fn().mockResolvedValue({ id: 5, name: RoleTypes.Partner }),
    findByRole: jest.fn((roleName: RoleTypes) => {
      const ids: Record<string, number> = {
        [RoleTypes.CompanyAdmin]: 6,
        [RoleTypes.SalesManager]: 7,
        [RoleTypes.TechnicalSpecialist]: 8,
        [RoleTypes.Staff]: 9,
      };

      return Promise.resolve({ id: ids[roleName] || 99, name: roleName });
    }),
    ...overrides.roleRepository,
  };
  const companyRepository = {
    findOneBy: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue({ id: 11, owner_id: 101 }),
    ...overrides.companyRepository,
  };
  const companyEmployeeRepository = {
    save: jest.fn().mockResolvedValue({}),
    ...overrides.companyEmployeeRepository,
  };
  const userSettingRepository = {
    save: jest.fn().mockResolvedValue({}),
    ...overrides.userSettingRepository,
  };
  const emailConfirmerService = {
    send: jest.fn().mockResolvedValue({}),
    emailSend: jest.fn().mockResolvedValue({}),
    ...overrides.emailConfirmerService,
  };
  const userTokenRepository = {
    save: jest.fn().mockResolvedValue({}),
    ...overrides.userTokenRepository,
  };
  const userRoleRepository = {
    save: jest.fn().mockResolvedValue({}),
    ...overrides.userRoleRepository,
  };

  return {
    service: new UserService(
      forbiddenInnRepository as any,
      userRepository as any,
      userInfoRepository as any,
      roleRepository as any,
      companyRepository as any,
      companyEmployeeRepository as any,
      userSettingRepository as any,
      emailConfirmerService as any,
      userTokenRepository as any,
      userRoleRepository as any,
    ),
    mocks: {
      forbiddenInnRepository,
      userRepository,
      userInfoRepository,
      roleRepository,
      companyRepository,
      companyEmployeeRepository,
      userSettingRepository,
      emailConfirmerService,
      userTokenRepository,
      userRoleRepository,
    },
  };
};

describe("UserService business roles", () => {
  const employeeDto = {
    email: "employee@test.local",
    password: "password",
    first_name: "Ivan",
    last_name: "Ivanov",
    job_title: "Менеджер по продажам",
    phone: "+79990000000",
    company_inn: "7700000000",
  };

  const companyDto = {
    email: "owner@test.local",
    password: "password",
    first_name: "Petr",
    last_name: "Petrov",
    company_name: "Partner LLC",
    job_title: "CEO",
    phone: "+79990000001",
    inn: "7700000001",
  };

  it("назначает первому пользователю новой компании роли partner и company_admin", async () => {
    const { service, mocks } = makeService();

    await service.createCompany(companyDto as any);

    expect(mocks.roleRepository.getPartner).toHaveBeenCalled();
    expect(mocks.roleRepository.findByRole).toHaveBeenCalledWith(
      RoleTypes.CompanyAdmin,
    );
    expect(mocks.userRoleRepository.save).toHaveBeenCalledWith({
      user_id: 101,
      role_id: 5,
    });
    expect(mocks.userRoleRepository.save).toHaveBeenCalledWith({
      user_id: 101,
      role_id: 6,
    });
  });

  it("по умолчанию регистрирует сотрудника как sales_manager поверх базовой роли employee", async () => {
    const { service, mocks } = makeService({
      companyRepository: {
        findOneBy: jest.fn().mockResolvedValue({ id: 11, name: "Partner LLC" }),
      },
    });

    await service.createEmployee(employeeDto as any);

    expect(mocks.roleRepository.getEmployee).toHaveBeenCalled();
    expect(mocks.roleRepository.findByRole).toHaveBeenCalledWith(
      RoleTypes.SalesManager,
    );
    expect(mocks.userRoleRepository.save).toHaveBeenCalledWith({
      user_id: 101,
      role_id: 7,
    });
    expect(mocks.userRoleRepository.save).not.toHaveBeenCalledWith({
      user_id: 101,
      role_id: 2,
    });
  });

  it("для варианта Другое сохраняет текстовую должность и назначает системную роль staff", async () => {
    const { service, mocks } = makeService({
      companyRepository: {
        findOneBy: jest.fn().mockResolvedValue({ id: 11, name: "Partner LLC" }),
      },
    });

    await service.createEmployee({
      ...employeeDto,
      job_title: "Специалист по закупкам",
      business_role: RoleTypes.Staff,
    } as any);

    expect(mocks.roleRepository.findByRole).toHaveBeenCalledWith(
      RoleTypes.Staff,
    );
    expect(mocks.userInfoRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ job_title: "Специалист по закупкам" }),
    );
    expect(mocks.userRoleRepository.save).toHaveBeenCalledWith({
      user_id: 101,
      role_id: 9,
    });
  });

  it("назначает технического специалиста при выборе этой должности на регистрации", async () => {
    const { service, mocks } = makeService({
      companyRepository: {
        findOneBy: jest.fn().mockResolvedValue({ id: 11, name: "Partner LLC" }),
      },
    });

    await service.createEmployee({
      ...employeeDto,
      job_title: "Технический специалист",
      business_role: RoleTypes.TechnicalSpecialist,
    } as any);

    expect(mocks.roleRepository.findByRole).toHaveBeenCalledWith(
      RoleTypes.TechnicalSpecialist,
    );
    expect(mocks.userRoleRepository.save).toHaveBeenCalledWith({
      user_id: 101,
      role_id: 8,
    });
  });
});
