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
  };
  const notificationService = {
    send: jest.fn().mockResolvedValue(undefined),
  };
  const service = new ConfiguratorDraftsService(
    draftRepository as any,
    companyEmployeeRepository as any,
    notificationService as any,
  );

  return {
    service,
    draftRepository,
    companyEmployeeRepository,
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
      response:
        "Делиться конфигурацией можно только с сотрудником своей компании",
    });
    expect(dependencies.draftRepository.save).not.toHaveBeenCalled();
    expect(dependencies.notificationService.send).not.toHaveBeenCalled();
  });
});
