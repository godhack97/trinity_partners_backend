import { CompanyEmployeeEntity } from "../entities";
import { CompanyEmployeeRepository } from "./company-employee.repository";

describe("CompanyEmployeeRepository", () => {
  const activeEmployee = {
    id: 1,
    company_id: 10,
    employee_id: 100,
    employee: { id: 100 },
  } as CompanyEmployeeEntity;
  const missingEmployee = {
    id: 2,
    company_id: 10,
    employee_id: 200,
    employee: null,
  } as CompanyEmployeeEntity;

  const makeRepository = () => {
    const find = jest.fn().mockResolvedValue([activeEmployee, missingEmployee]);
    const repository = Object.create(
      CompanyEmployeeRepository.prototype,
    ) as CompanyEmployeeRepository;

    Object.defineProperty(repository, "repo", {
      value: { find },
    });

    return { repository, find };
  };

  it.each([
    ["all companies", (repository: CompanyEmployeeRepository) =>
      repository.findAllCompanyEmployeesWithUsersAndInfo()],
    ["one company", (repository: CompanyEmployeeRepository) =>
      repository.findCompanyEmployeesByCompanyId(10)],
    ["multiple companies", (repository: CompanyEmployeeRepository) =>
      repository.findCompanyEmployeesByCompanyIds([10])],
  ])("excludes missing employees when loading %s", async (_, load) => {
    const { repository } = makeRepository();

    await expect(load(repository)).resolves.toEqual([activeEmployee]);
  });
});
