import { DealRepository } from "./deal.repository";

describe("DealRepository company scope", () => {
  it("uses canonical company FKs and includes only the current creator directly", async () => {
    const queryBuilder: Record<string, jest.Mock> = {};
    for (const method of ["leftJoinAndSelect", "leftJoin", "addSelect", "andWhere"]) {
      queryBuilder[method] = jest.fn().mockReturnValue(queryBuilder);
    }
    queryBuilder.getRawAndEntities = jest
      .fn()
      .mockResolvedValue({ entities: [], raw: [] });

    await DealRepository.prototype.findDealsWithFilters.call(
      { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder) },
      { companyId: 10 },
      undefined,
      7,
    );

    const companyFilterCall = queryBuilder.andWhere.mock.calls.find(
      ([sql]) => `${sql}`.includes("deal.creator_company_id"),
    );
    expect(companyFilterCall).toBeDefined();
    expect(companyFilterCall[0]).toContain(
      "deal.integrator_company_id = :companyId",
    );
    expect(companyFilterCall[0]).toContain(
      "deal.distributor_company_id = :companyId",
    );
    expect(companyFilterCall[0]).toContain(
      "deal.creator_company_id = :companyId",
    );
    expect(companyFilterCall[0]).toContain(
      "deal.creator_id = :alwaysIncludeCreatorId",
    );
    expect(companyFilterCall[0]).not.toContain("LOWER(");
    expect(companyFilterCall[0]).not.toContain("company_employees");
    expect(companyFilterCall[1]).toEqual({
      companyId: 10,
      alwaysIncludeCreatorId: 7,
    });
  });
});
