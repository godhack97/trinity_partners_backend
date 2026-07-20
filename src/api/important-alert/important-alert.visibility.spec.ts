import { IsNull } from "typeorm";
import { ImportantAlertRepository } from "@orm/repositories";

describe("important alert company visibility", () => {
  it("returns only global active alerts when a user has no company", async () => {
    const repository: any = Object.create(ImportantAlertRepository.prototype);
    repository.find = jest.fn().mockResolvedValue([{ id: 1 }]);

    await expect(repository.findActiveForCompany(null)).resolves.toEqual([{ id: 1 }]);
    expect(repository.find).toHaveBeenCalledWith({
      where: { is_active: true, target_company_id: IsNull() },
    });
  });

  it("returns global alerts plus alerts for the authenticated user's company", async () => {
    const getMany = jest.fn().mockResolvedValue([{ id: 2, target_company_id: 42 }]);
    const builder: any = {
      where: jest.fn(),
      andWhere: jest.fn(),
      getMany,
    };
    builder.where.mockReturnValue(builder);
    builder.andWhere.mockReturnValue(builder);
    const repository: any = Object.create(ImportantAlertRepository.prototype);
    repository.createQueryBuilder = jest.fn().mockReturnValue(builder);

    await expect(repository.findActiveForCompany(42)).resolves.toEqual([
      { id: 2, target_company_id: 42 },
    ]);
    expect(builder.andWhere).toHaveBeenCalledWith(
      "(alert.target_company_id IS NULL OR alert.target_company_id = :companyId)",
      { companyId: 42 },
    );
  });
});
