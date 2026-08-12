import {
  CompanyStatus,
  PartnershipType,
} from "@orm/entities/company.entity";
import { CompanyRepository } from "./company.repository";

describe("CompanyRepository partner directory", () => {
  it("selects only public participant fields", async () => {
    const find = jest.fn().mockResolvedValue([]);

    await CompanyRepository.prototype.findAcceptedByPartnershipType.call(
      { find },
      PartnershipType.Distributor,
    );

    expect(find).toHaveBeenCalledWith({
      where: {
        partnership_type: PartnershipType.Distributor,
        status: CompanyStatus.Accept,
      },
      select: {
        id: true,
        name: true,
        inn: true,
        partnership_type: true,
      },
      order: { name: "ASC" },
    });
  });

  it("fails closed when a user resolves to more than one accepted company", async () => {
    const queryBuilder: Record<string, jest.Mock> = {};
    for (const method of [
      "leftJoin",
      "where",
      "andWhere",
      "distinct",
      "limit",
    ]) {
      queryBuilder[method] = jest.fn().mockReturnValue(queryBuilder);
    }
    queryBuilder.getMany = jest
      .fn()
      .mockResolvedValue([{ id: 10 }, { id: 11 }]);

    await expect(
      CompanyRepository.prototype.findUniqueAcceptedByUserId.call(
        { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder) },
        7,
      ),
    ).resolves.toBeNull();

    expect(queryBuilder.distinct).toHaveBeenCalledWith(true);
    expect(queryBuilder.limit).toHaveBeenCalledWith(2);
    expect(queryBuilder.getMany).toHaveBeenCalledTimes(1);
  });
});
