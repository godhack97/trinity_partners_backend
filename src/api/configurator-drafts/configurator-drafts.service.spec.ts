import { HttpStatus } from "@nestjs/common";
import { ConfiguratorDraftsService } from "./configurator-drafts.service";

const originalDraft = {
  id: 10,
  creator_id: 143,
  title: "Shared server",
  server_id: "server-1",
  serverbox_height_id: "height-1",
  components: [],
  total_price: 100,
  description: "Description",
};

const createService = () => {
  const draftRepository = {
    findById: jest
      .fn()
      .mockResolvedValueOnce(originalDraft)
      .mockResolvedValueOnce({ ...originalDraft, id: 11 }),
    save: jest.fn().mockResolvedValue({ ...originalDraft, id: 11 }),
  };
  const companyEmployeeRepository = {
    find: jest.fn(),
    findCompanyEmployeesByCompanyIds: jest.fn().mockResolvedValue([]),
  };
  const companyRepository = {
    find: jest.fn().mockResolvedValue([]),
  };
  const technicalSpecialistQuery = {
    distinct: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };
  const userRepository = {
    findOne: jest.fn().mockResolvedValue({
      id: 200,
      email: "recipient@example.test",
      is_activated: true,
      role: { name: "employee" },
      user_roles: [],
      user_info: {},
    }),
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn().mockReturnValue(technicalSpecialistQuery),
  };
  const notificationService = {
    send: jest.fn().mockResolvedValue(undefined),
  };
  const service = new ConfiguratorDraftsService(
    draftRepository as any,
    companyEmployeeRepository as any,
    companyRepository as any,
    userRepository as any,
    notificationService as any,
  );

  return {
    service,
    draftRepository,
    companyEmployeeRepository,
    companyRepository,
    userRepository,
    technicalSpecialistQuery,
    notificationService,
  };
};

describe("ConfiguratorDraftsService.share", () => {
  it("allows the built-in super-admin to share with any accepted employee", async () => {
    const dependencies = createService();
    dependencies.companyEmployeeRepository.find.mockResolvedValue([
      { employee_id: 200, company_id: 99 },
    ]);

    await expect(
      dependencies.service.share(
        10,
        { id: 143, email: "sancho97.2011@mail.ru" } as any,
        { employee_id: 200 },
      ),
    ).resolves.toMatchObject({ id: 11 });

    expect(dependencies.companyEmployeeRepository.find).toHaveBeenCalledTimes(
      1,
    );
    expect(dependencies.draftRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ creator_id: 200, shared_by_id: 143 }),
    );
    expect(dependencies.notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 200, webOnly: true }),
    );
  });

  it("allows regular users when any accepted company membership overlaps", async () => {
    const dependencies = createService();
    dependencies.companyEmployeeRepository.find
      .mockResolvedValueOnce([
        { employee_id: 200, company_id: 20 },
        { employee_id: 200, company_id: 30 },
      ])
      .mockResolvedValueOnce([
        { employee_id: 100, company_id: 10 },
        { employee_id: 100, company_id: 30 },
      ]);

    await expect(
      dependencies.service.share(
        10,
        { id: 143, email: "partner@example.test" } as any,
        { employee_id: 200 },
      ),
    ).resolves.toMatchObject({ id: 11 });
  });

  it("rejects regular users without a shared accepted company", async () => {
    const dependencies = createService();
    dependencies.companyEmployeeRepository.find
      .mockResolvedValueOnce([{ employee_id: 200, company_id: 20 }])
      .mockResolvedValueOnce([{ employee_id: 100, company_id: 10 }]);

    await expect(
      dependencies.service.share(
        10,
        { id: 143, email: "partner@example.test" } as any,
        { employee_id: 200 },
      ),
    ).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
      response: "Получатель недоступен для отправки конфигурации",
    });
    expect(dependencies.draftRepository.save).not.toHaveBeenCalled();
    expect(dependencies.notificationService.send).not.toHaveBeenCalled();
  });

  it("allows an integrator employee to share with the assigned responsible manager", async () => {
    const dependencies = createService();
    dependencies.companyEmployeeRepository.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ employee_id: 143, company_id: 10 }]);
    dependencies.companyRepository.find.mockResolvedValue([
      {
        id: 10,
        partnership_type: "integrator",
        status: "accept",
        responsible_manager_id: 200,
      },
    ]);

    await expect(
      dependencies.service.share(
        10,
        { id: 143, email: "integrator@example.test" } as any,
        { employee_id: 200 },
      ),
    ).resolves.toMatchObject({ id: 11 });
  });

  it("allows an integrator employee to share with an active technical specialist", async () => {
    const dependencies = createService();
    dependencies.companyEmployeeRepository.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ employee_id: 143, company_id: 10 }]);
    dependencies.companyRepository.find.mockResolvedValue([
      {
        id: 10,
        partnership_type: "integrator",
        status: "accept",
        responsible_manager_id: 300,
      },
    ]);
    dependencies.userRepository.findOne.mockResolvedValue({
      id: 200,
      email: "tech@example.test",
      is_activated: true,
      role: { name: "technical_specialist" },
      user_roles: [],
      user_info: {},
    });

    await expect(
      dependencies.service.share(
        10,
        { id: 143, email: "integrator@example.test" } as any,
        { employee_id: 200 },
      ),
    ).resolves.toMatchObject({ id: 11 });
  });
});

describe("ConfiguratorDraftsService.getShareRecipients", () => {
  it("returns colleagues, the responsible manager and active vendor technical specialists", async () => {
    const dependencies = createService();
    dependencies.companyEmployeeRepository.find.mockResolvedValue([
      { employee_id: 100, company_id: 10 },
    ]);
    dependencies.companyEmployeeRepository.findCompanyEmployeesByCompanyIds.mockResolvedValue(
      [
        {
          employee_id: 100,
          status: "accept",
          employee: { id: 100, is_activated: true },
        },
        {
          employee_id: 101,
          status: "accept",
          employee: {
            id: 101,
            email: "colleague@example.test",
            is_activated: true,
            user_info: { first_name: "Анна", last_name: "Коллега" },
          },
        },
      ],
    );
    dependencies.companyRepository.find.mockResolvedValue([
      { id: 10, responsible_manager_id: 200 },
    ]);
    dependencies.userRepository.find.mockResolvedValue([
      {
        id: 200,
        email: "manager@example.test",
        is_activated: true,
        user_info: { first_name: "Борис", last_name: "Менеджер" },
      },
    ]);
    dependencies.technicalSpecialistQuery.getMany.mockResolvedValue([
      {
        id: 300,
        email: "tech@example.test",
        is_activated: true,
        user_info: { first_name: "Виктор", last_name: "Технарь" },
      },
    ]);

    await expect(
      dependencies.service.getShareRecipients({ id: 100 } as any),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 101,
        recipient_type: "company_employee",
      }),
      expect.objectContaining({
        id: 200,
        recipient_type: "responsible_manager",
      }),
      expect.objectContaining({
        id: 300,
        recipient_type: "technical_specialist",
      }),
    ]);
  });
});
