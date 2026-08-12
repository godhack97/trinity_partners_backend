import { HttpException } from "@nestjs/common";
import { RoleTypes } from "@app/types/RoleTypes";
import {
  CompanyEmployeeStatus,
  CompanyStatus,
  DealStatus,
  PartnershipType,
} from "@orm/entities";
import { DealService } from "./deal.service";

const makeUser = (id: number, roles: RoleTypes[]) =>
  ({
    id,
    role: { name: roles[0] || RoleTypes.Employee },
    roles: roles.map((name) => ({ name })),
  }) as any;

const zeroStatistics = {
  allCount: 0,
  draft: 0,
  canceled: 0,
  registered: 0,
  moderation: 0,
  win: 0,
  loose: 0,
};

function makeService(options: {
  deals: any[];
  actorCompany?: any;
  actorEmployeeIds?: number[];
  companyEmployeeIds?: number[];
  creatorCompanies?: Map<number, any>;
}) {
  const creatorCompanies = options.creatorCompanies || new Map<number, any>();
  const actorEmployeeIds = new Set(options.actorEmployeeIds || []);
  const dealRepository = {
    findDealsWithFilters: jest.fn(
      async (entry?: { status?: DealStatus }, creatorIds?: number[]) =>
        options.deals.filter(
          (deal) =>
            (!entry?.status || deal.status === entry.status) &&
            (!creatorIds || creatorIds.includes(deal.creator_id)),
        ),
    ),
    findById: jest.fn(async (id: number) =>
      options.deals.find((deal) => deal.id === id),
    ),
  };
  const companyRepository = {
    findByOwnerId: jest.fn(async (userId: number) => {
      if (options.actorCompany?.owner_id === userId) {
        return options.actorCompany;
      }
      return creatorCompanies.get(userId) || null;
    }),
    findUniqueAcceptedByUserId: jest.fn(async (userId: number) => {
      if (options.actorCompany?.owner_id === userId) {
        return options.actorCompany;
      }
      if (options.actorCompany && actorEmployeeIds.has(userId)) {
        return options.actorCompany;
      }
      return creatorCompanies.get(userId) || null;
    }),
    findOneBy: jest.fn(async ({ id }: { id: number }) => {
      const companies = [
        options.actorCompany,
        ...Array.from(creatorCompanies.values()),
      ].filter(Boolean);
      return companies.find((company) => company.id === id) || null;
    }),
    findById: jest.fn(async (id: number) => {
      const companies = [
        options.actorCompany,
        ...Array.from(creatorCompanies.values()),
      ].filter(Boolean);
      return companies.find((company) => company.id === id) || null;
    }),
    findAcceptedDistributorByName: jest.fn().mockResolvedValue(null),
    findAcceptedIntegratorByInn: jest.fn().mockResolvedValue(null),
  };
  const companyEmployeeRepository = {
    findOne: jest.fn(async ({ where }: any) => {
      if (options.actorCompany && actorEmployeeIds.has(where.employee_id)) {
        return {
          company_id: options.actorCompany.id,
          company: options.actorCompany,
        };
      }
      const company = creatorCompanies.get(where.employee_id);
      return company
        ? { company_id: company.id, company }
        : null;
    }),
    findCompanyEmployeesByCompanyId: jest.fn(async () =>
      (options.companyEmployeeIds || []).map((employeeId) => ({
        employee_id: employeeId,
        status: CompanyEmployeeStatus.Accept,
      })),
    ),
  };

  const service = new DealService(
    { findByName: jest.fn() } as any,
    {} as any,
    dealRepository as any,
    companyRepository as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    companyEmployeeRepository as any,
    {} as any,
    { get: jest.fn() } as any,
    {} as any,
  );

  return { service, dealRepository };
}

describe("DealService row-level access scope", () => {
  it("keeps SalesManager list, detail, counts and statistics in parity", async () => {
    const actor = makeUser(4, [RoleTypes.SalesManager]);
    const company = {
      id: 10,
      owner_id: 1,
      name: "Интегратор",
      inn: "7700000000",
      partnership_type: PartnershipType.Integrator,
      status: CompanyStatus.Accept,
    };
    const deals = [
      {
        id: 1,
        creator_id: actor.id,
        creator_company_id: company.id,
        integrator_company_id: company.id,
        status: DealStatus.Draft,
      },
      {
        id: 2,
        creator_id: 2,
        creator_company_id: company.id,
        integrator_company_id: company.id,
        status: DealStatus.Draft,
      },
      {
        id: 3,
        creator_id: 98,
        integrator_company_id: company.id,
        status: DealStatus.Moderation,
      },
      {
        id: 4,
        creator_id: 97,
        integrator_company_id: 999,
        status: DealStatus.Registered,
      },
      {
        id: 5,
        creator_id: 96,
        integrator_company_id: company.id,
        status: DealStatus.Registered,
      },
    ];
    const { service } = makeService({
      deals,
      actorCompany: company,
      actorEmployeeIds: [actor.id],
      companyEmployeeIds: [actor.id, 2],
    });

    await expect(service.findAll(actor)).resolves.toEqual([
      deals[0],
      deals[2],
      deals[4],
    ]);
    await expect(service.findOne(1, actor)).resolves.toMatchObject({ id: 1 });
    await expect(service.findOne(2, actor)).rejects.toBeInstanceOf(
      HttpException,
    );
    await expect(service.findOne(3, actor)).resolves.toMatchObject({ id: 3 });
    await expect(service.getCount(actor)).resolves.toBe(3);
    await expect(service.getAllCount(actor)).resolves.toBe(3);
    await expect(service.getModerationCount(actor)).resolves.toBe(1);
    await expect(
      service.getCountByStatus(DealStatus.Moderation, actor),
    ).resolves.toBe(1);
    await expect(service.getRegisteredCount(actor)).resolves.toBe(1);
    await expect(service.getDealStatistic(actor)).resolves.toEqual({
      ...zeroStatistics,
      allCount: 3,
      draft: 1,
      moderation: 1,
      registered: 1,
    });
  });

  it("applies distributor approval gating identically everywhere", async () => {
    const actor = makeUser(1, [RoleTypes.CompanyAdmin]);
    const company = {
      id: 20,
      owner_id: actor.id,
      name: "Дистрибьютор",
      inn: "7800000000",
      partnership_type: PartnershipType.Distributor,
      status: CompanyStatus.Accept,
    };
    const deals = [
      {
        id: 11,
        creator_id: 2,
        creator_company_id: company.id,
        status: DealStatus.Draft,
      },
      {
        id: 12,
        creator_id: 90,
        distributor_company_id: company.id,
        status: DealStatus.Moderation,
      },
      {
        id: 13,
        creator_id: 90,
        distributor_company_id: company.id,
        status: DealStatus.Registered,
      },
      {
        id: 14,
        creator_id: 91,
        distributor_company_id: company.id,
        status: DealStatus.Win,
      },
      {
        id: 15,
        creator_id: 92,
        distributor_company_id: 999,
        status: DealStatus.Registered,
      },
    ];
    const { service } = makeService({
      deals,
      actorCompany: company,
      companyEmployeeIds: [2],
    });

    await expect(service.findAll(actor)).resolves.toEqual([
      deals[0],
      deals[2],
      deals[3],
    ]);
    await expect(service.findOne(12, actor)).rejects.toBeInstanceOf(
      HttpException,
    );
    await expect(service.findOne(13, actor)).resolves.toMatchObject({ id: 13 });
    await expect(service.getCount(actor)).resolves.toBe(3);
    await expect(service.getModerationCount(actor)).resolves.toBe(0);
    await expect(service.getRegisteredCount(actor)).resolves.toBe(1);
    await expect(service.getWinCount(actor)).resolves.toBe(1);
    await expect(service.getDealStatistic(actor)).resolves.toEqual({
      ...zeroStatistics,
      allCount: 3,
      draft: 1,
      registered: 1,
      win: 1,
    });
  });

  it("keeps a removed employee's deal visible to its snapshotted company", async () => {
    const actor = makeUser(1, [RoleTypes.CompanyAdmin]);
    const company = {
      id: 25,
      owner_id: actor.id,
      name: "Интегратор",
      inn: "7800000000",
      partnership_type: PartnershipType.Integrator,
      status: CompanyStatus.Accept,
    };
    const deal = {
      id: 16,
      creator_id: 99,
      creator_company_id: company.id,
      integrator_company_id: 999,
      status: DealStatus.Draft,
    };
    const { service } = makeService({
      deals: [deal],
      actorCompany: company,
      companyEmployeeIds: [],
    });

    await expect(service.findAll(actor)).resolves.toEqual([deal]);
    await expect(service.findOne(deal.id, actor)).resolves.toMatchObject({
      id: deal.id,
      creator_id: 99,
      creator_company_id: company.id,
    });
  });

  it("does not grant company-wide access to a legacy deal without a creator snapshot", async () => {
    const actor = makeUser(1, [RoleTypes.CompanyAdmin]);
    const company = {
      id: 27,
      owner_id: actor.id,
      name: "Интегратор",
      inn: "7700000000",
      partnership_type: PartnershipType.Integrator,
      status: CompanyStatus.Accept,
    };
    const legacyDeal = {
      id: 18,
      creator_id: 2,
      creator_company_id: null,
      integrator_company_id: 999,
      status: DealStatus.Draft,
    };
    const { service } = makeService({
      deals: [legacyDeal],
      actorCompany: company,
      companyEmployeeIds: [2],
    });

    await expect(service.findAll(actor)).resolves.toEqual([]);
    await expect(service.findOne(legacyDeal.id, actor)).rejects.toBeInstanceOf(
      HttpException,
    );
  });

  it("keeps a legacy deal without a snapshot visible to its creator only", async () => {
    const actor = makeUser(4, [RoleTypes.SalesManager]);
    const company = {
      id: 28,
      owner_id: 1,
      name: "Интегратор",
      inn: "7700000000",
      partnership_type: PartnershipType.Integrator,
      status: CompanyStatus.Accept,
    };
    const legacyDeal = {
      id: 19,
      creator_id: actor.id,
      creator_company_id: null,
      integrator_company_id: 999,
      status: DealStatus.Draft,
    };
    const { service, dealRepository } = makeService({
      deals: [legacyDeal],
      actorCompany: company,
      actorEmployeeIds: [actor.id],
    });

    await expect(service.findAll(actor)).resolves.toEqual([legacyDeal]);
    await expect(service.findOne(legacyDeal.id, actor)).resolves.toMatchObject({
      id: legacyDeal.id,
      creator_id: actor.id,
    });
    expect(dealRepository.findDealsWithFilters).toHaveBeenCalledWith(
      { companyId: company.id },
      undefined,
      actor.id,
    );
  });

  it.each([
    {
      partnershipType: PartnershipType.Integrator,
      participantFields: { integrator_inn: "7700000000" },
    },
    {
      partnershipType: PartnershipType.Distributor,
      participantFields: { distributor: { name: "Одинаковое имя" } },
    },
  ])(
    "fails closed when a $partnershipType deal only matches legacy identity fields",
    async ({ partnershipType, participantFields }) => {
      const actor = makeUser(1, [RoleTypes.CompanyAdmin]);
      const company = {
        id: 26,
        owner_id: actor.id,
        name: "Одинаковое имя",
        inn: "7700000000",
        partnership_type: partnershipType,
        status: CompanyStatus.Accept,
      };
      const deal = {
        id: 17,
        creator_id: 99,
        creator_company_id: 999,
        status: DealStatus.Registered,
        ...participantFields,
      };
      const { service } = makeService({ deals: [deal], actorCompany: company });

      await expect(service.findAll(actor)).resolves.toEqual([]);
      await expect(service.findOne(deal.id, actor)).rejects.toBeInstanceOf(
        HttpException,
      );
    },
  );

  it("limits PartnerManager to own and currently responsible companies", async () => {
    const actor = makeUser(7, [RoleTypes.PartnerManager]);
    const managedCompany = { id: 30, responsible_manager_id: actor.id };
    const foreignCompany = { id: 31, responsible_manager_id: 8 };
    const deals = [
      { id: 21, creator_id: actor.id, status: DealStatus.Draft },
      {
        id: 22,
        creator_id: 2,
        status: DealStatus.Moderation,
        responsible_manager_id: actor.id,
      },
      {
        id: 23,
        creator_id: 3,
        status: DealStatus.Registered,
        responsible_manager_id: 8,
      },
    ];
    const { service } = makeService({
      deals,
      creatorCompanies: new Map([
        [2, managedCompany],
        [3, foreignCompany],
      ]),
    });

    await expect(service.findAll(actor)).resolves.toEqual([deals[0], deals[1]]);
    await expect(service.findOne(22, actor)).resolves.toMatchObject({ id: 22 });
    await expect(service.findOne(23, actor)).rejects.toBeInstanceOf(
      HttpException,
    );
    await expect(
      service.findAll(actor, { companyId: foreignCompany.id } as any),
    ).rejects.toBeInstanceOf(HttpException);
    await expect(service.getCount(actor)).resolves.toBe(2);
    await expect(service.getModerationCount(actor)).resolves.toBe(1);
    await expect(service.getRegisteredCount(actor)).resolves.toBe(0);
    await expect(service.getDealStatistic(actor)).resolves.toEqual({
      ...zeroStatistics,
      allCount: 2,
      draft: 1,
      moderation: 1,
    });
  });

  it("keeps PartnerManager access bound to the deal snapshot after company reassignment", async () => {
    const actor = makeUser(7, [RoleTypes.PartnerManager]);
    const deals = [
      {
        id: 24,
        creator_id: 2,
        status: DealStatus.Moderation,
        responsible_manager_id: actor.id,
      },
      {
        id: 25,
        creator_id: 3,
        status: DealStatus.Moderation,
        responsible_manager_id: 8,
      },
    ];
    const { service } = makeService({
      deals,
      creatorCompanies: new Map([
        [2, { id: 30, responsible_manager_id: 8 }],
        [3, { id: 31, responsible_manager_id: actor.id }],
      ]),
    });

    await expect(service.findAll(actor)).resolves.toEqual([deals[0]]);
    await expect(service.findOne(24, actor)).resolves.toMatchObject({ id: 24 });
    await expect(service.findOne(25, actor)).rejects.toBeInstanceOf(
      HttpException,
    );
  });

  it("keeps technical specialists global and read-only", async () => {
    const actor = makeUser(9, [RoleTypes.TechnicalSpecialist]);
    const deals = [
      { id: 31, creator_id: 1, status: DealStatus.Draft },
      { id: 32, creator_id: 2, status: DealStatus.Registered },
    ];
    const { service } = makeService({ deals });

    await expect(service.findAll(actor)).resolves.toEqual(deals);
    await expect(service.getCount(actor)).resolves.toBe(2);
    await expect(service.getRegisteredCount(actor)).resolves.toBe(1);
    await expect(service.findOne(32, actor)).resolves.toMatchObject({
      id: 32,
      can_update_fields: false,
      can_update_status: false,
    });
    await expect(service.getDealStatistic(actor)).resolves.toEqual({
      ...zeroStatistics,
      allCount: 2,
      draft: 1,
      registered: 1,
    });
  });

  it("keeps a mixed PartnerManager and technical role inside manager scope", async () => {
    const actor = makeUser(9, [
      RoleTypes.PartnerManager,
      RoleTypes.TechnicalSpecialist,
    ]);
    const deals = [
      {
        id: 33,
        creator_id: 2,
        responsible_manager_id: actor.id,
        status: DealStatus.Moderation,
      },
      {
        id: 34,
        creator_id: 3,
        responsible_manager_id: 10,
        status: DealStatus.Moderation,
      },
    ];
    const { service } = makeService({ deals });

    await expect(service.findAll(actor)).resolves.toEqual([deals[0]]);
    await expect(service.findOne(33, actor)).resolves.toMatchObject({
      id: 33,
      can_update_fields: true,
      can_update_status: true,
    });
    await expect(service.findOne(34, actor)).rejects.toBeInstanceOf(
      HttpException,
    );
  });

  it("returns an empty scoped aggregate to roles without deal access", async () => {
    const actor = makeUser(12, [RoleTypes.Staff]);
    const { service, dealRepository } = makeService({
      deals: [{ id: 41, creator_id: actor.id, status: DealStatus.Draft }],
    });

    await expect(service.findAll(actor)).resolves.toEqual([]);
    await expect(service.getCount(actor)).resolves.toBe(0);
    await expect(service.getDealStatistic(actor)).resolves.toEqual(
      zeroStatistics,
    );
    await expect(service.findOne(41, actor)).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(dealRepository.findDealsWithFilters).not.toHaveBeenCalled();
  });
});
