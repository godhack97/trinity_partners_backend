import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  CompanyListQueryDto,
  CompanyRestrictionReasonRequestDto,
  UpdateCompanyContactsRequestDto,
} from "./company-management.request.dto";

const validateStrict = <T extends object>(type: new () => T, payload: unknown) =>
  validate(plainToInstance(type, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

describe("company management request DTOs", () => {
  it("normalizes search and numeric filters", async () => {
    const dto = plainToInstance(CompanyListQueryDto, {
      search: "  7700123456  ",
      responsible_manager_id: "7",
      current_page: "2",
      limit: "12",
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({
      search: "7700123456",
      responsible_manager_id: 7,
      current_page: 2,
      limit: 12,
    });
  });

  it("requires a non-empty restriction reason", async () => {
    await expect(
      validateStrict(CompanyRestrictionReasonRequestDto, { reason: "   " }),
    ).resolves.not.toHaveLength(0);
    await expect(
      validateStrict(CompanyRestrictionReasonRequestDto, {
        reason: "Нарушены условия программы",
      }),
    ).resolves.toHaveLength(0);
  });

  it("accepts clearing contacts and rejects lifecycle or identity fields", async () => {
    await expect(
      validateStrict(UpdateCompanyContactsRequestDto, {
        contact_email: "",
        contact_phone: "",
        site_url: "",
        company_business_line: "",
      }),
    ).resolves.toHaveLength(0);

    const errors = await validateStrict(UpdateCompanyContactsRequestDto, {
      name: "Другая компания",
      inn: "7700123456",
      status: "accept",
      responsible_manager_id: 7,
    });
    expect(errors.map(({ property }) => property)).toEqual(
      expect.arrayContaining([
        "name",
        "inn",
        "status",
        "responsible_manager_id",
      ]),
    );
  });
});
