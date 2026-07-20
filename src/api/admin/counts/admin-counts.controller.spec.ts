import { RoleTypes } from "@app/types/RoleTypes";
import { AdminCountsController } from "./admin-counts.controller";

const service = (methods: Record<string, number>) =>
  Object.fromEntries(
    Object.entries(methods).map(([name, value]) => [
      name,
      jest.fn().mockResolvedValue(value),
    ]),
  );

function createController() {
  const news = service({ getCount: 1 });
  const admins = {
    ...service({ getCount: 2, getArchivedCount: 3 }),
    getCountsByAllRoles: jest.fn().mockResolvedValue({
      super_admin: 1,
      employee_admin: 2,
      content_manager: 3,
      partner_manager: 4,
    }),
  };
  const employees = service({ getCount: 5 });
  const partners = service({ getCountByStatus: 6 });
  const configurator = service({
    getServerboxCount: 7,
    getSlotsCount: 8,
    getServerGenerationsCount: 9,
    getServersCount: 10,
    getProcessorGenerationsCount: 11,
    getComponentsCount: 12,
    componentstypesCount: 13,
  });
  const distributors = service({ getCount: 14 });
  const deals = service({
    getCount: 15,
    getModerationCount: 16,
    getRegisteredCount: 17,
    getCanceledCount: 18,
    getWinCount: 19,
    getLooseCount: 20,
    getRequestDeletedCount: 21,
  });
  const logs = service({ getCount: 22 });
  const alerts = service({ getCount: 23 });

  return {
    controller: new AdminCountsController(
      news as any,
      admins as any,
      employees as any,
      partners as any,
      configurator as any,
      distributors as any,
      deals as any,
      logs as any,
      alerts as any,
    ),
    services: { news, admins, employees, partners, configurator, deals, logs, alerts },
  };
}

describe("AdminCountsController", () => {
  it("returns the complete scoped response to super_admin", async () => {
    const { controller } = createController();

    const response = await controller.getAllCounts({
      role: { name: RoleTypes.SuperAdmin },
    } as any);

    expect(response).toMatchObject({
      news: 1,
      admins: { all: 2, archived: 3 },
      partners: { users: 5, requests: 6, accepted: 6, rejected: 6, suspended: 6 },
      configurator: { components: 12, componentstypes: 13 },
      deals: { distributors: 14, all: 15, requestDeleted: 21 },
      tools: { logs: 22 },
      importantAlerts: 23,
    });
  });

  it("returns only partner workflow counts to partner_manager", async () => {
    const { controller, services } = createController();

    const response = await controller.getAllCounts({
      role: { name: RoleTypes.PartnerManager },
    } as any);

    expect(response).toEqual({
      partners: { requests: 6, accepted: 6, rejected: 6, suspended: 6 },
    });
    expect(services.employees.getCount).not.toHaveBeenCalled();
    expect((services.admins as any).getCount).not.toHaveBeenCalled();
    expect(services.news.getCount).not.toHaveBeenCalled();
  });

  it("returns only content counts to content_manager", async () => {
    const { controller, services } = createController();

    const response = await controller.getAllCounts({
      user_roles: [{ role: { name: RoleTypes.ContentManager } }],
    } as any);

    expect(response).toEqual({ news: 1, importantAlerts: 23 });
    expect(services.partners.getCountByStatus).not.toHaveBeenCalled();
    expect(services.deals.getCount).not.toHaveBeenCalled();
  });

  it("does not expose inaccessible section counts to employee_admin", async () => {
    const { controller, services } = createController();

    await expect(controller.getAllCounts({
      role: { name: RoleTypes.EmployeeAdmin },
    } as any)).resolves.toEqual({});

    expect(services.news.getCount).not.toHaveBeenCalled();
    expect(services.partners.getCountByStatus).not.toHaveBeenCalled();
    expect(services.logs.getCount).not.toHaveBeenCalled();
  });
});
