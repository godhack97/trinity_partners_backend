import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdatePartnerBusinessFieldsRequestDto } from "./update-partner-business-fields.request.dto";

const validateDto = (payload: unknown) =>
  validate(plainToInstance(UpdatePartnerBusinessFieldsRequestDto, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

describe("UpdatePartnerBusinessFieldsRequestDto", () => {
  it("accepts the reviewed company business fields and explicit nullable values", async () => {
    const dto = plainToInstance(UpdatePartnerBusinessFieldsRequestDto, {
      name: "Trinity Partner",
      partnership_type: "integrator",
      partner_level: "gold",
      certificate_expiry: "2027-12-31",
      email_domain: "example.com",
      company_business_line: "Infrastructure",
      employees_count: "25",
      site_url: "https://example.com",
      promoted_products: "Servers",
      products_of_interest: "Storage",
      main_customers: "Enterprise",
    });

    expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true }))
      .toHaveLength(0);
    expect(dto.employees_count).toBe(25);

    await expect(validateDto({
      partner_level: "",
      certificate_expiry: "",
      email_domain: "",
    })).resolves.toHaveLength(0);
  });

  it("rejects lifecycle/identity fields and malformed business values", async () => {
    const protectedErrors = await validateDto({
      status: "accept",
      inn: "7700000000",
      validated_by_manager_id: 1,
    });
    const valueErrors = await validateDto({
      partnership_type: "reseller",
      partner_level: "diamond",
      certificate_expiry: "not-a-date",
      employees_count: -1,
    });

    expect(protectedErrors).toHaveLength(3);
    expect(valueErrors.map(({ property }) => property)).toEqual(
      expect.arrayContaining([
        "partnership_type",
        "partner_level",
        "certificate_expiry",
        "employees_count",
      ]),
    );
  });
});
