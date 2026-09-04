import { RoleTypes } from "@app/types/RoleTypes";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ProfileUpdateRequestDto } from "./profile-update.request.dto";

describe("ProfileUpdateRequestDto company-field boundary", () => {
  const validatePartner = (payload: unknown) =>
    validate(plainToInstance(ProfileUpdateRequestDto, payload, {
      groups: [RoleTypes.Partner],
    }), {
      groups: [RoleTypes.Partner],
      whitelist: true,
      forbidNonWhitelisted: true,
    });

  it("allows personal contact fields", async () => {
    await expect(
      validatePartner({
        photo_url: "https://example.test/avatar.png",
        job_title: "Руководитель",
        phone: "+7 (900) 000-00-00",
      }),
    ).resolves.toHaveLength(0);
  });

  it.each([
    "company_business_line",
    "employees_count",
    "site_url",
    "promoted_products",
    "products_of_interest",
    "main_customers",
    "status",
    "inn",
  ])("rejects legacy company field %s", async (field) => {
    const errors = await validatePartner({
      job_title: "Руководитель",
      phone: "+7 (900) 000-00-00",
      [field]: "forbidden",
    });
    expect(errors.some(({ property }) => property === field)).toBe(true);
  });

  it("rejects a phone outside the input mask", async () => {
    const errors = await validatePartner({
      job_title: "Руководитель",
      phone: "+7 900 000-00-00",
    });

    expect(errors.some(({ property }) => property === "phone")).toBe(true);
  });
});
