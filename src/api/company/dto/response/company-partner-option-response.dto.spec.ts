import { PartnershipType } from "@orm/entities/company.entity";
import { plainToInstance } from "class-transformer";
import { CompanyPartnerOptionResponseDto } from "./company-partner-option-response.dto";

describe("CompanyPartnerOptionResponseDto", () => {
  it("exposes only participant selection fields", () => {
    const result = plainToInstance(
      CompanyPartnerOptionResponseDto,
      {
        id: 10,
        name: "Партнёр",
        inn: "7707083893",
        partnership_type: PartnershipType.Integrator,
        owner_id: 42,
        responsible_manager_id: 7,
        contact_email: "private@example.test",
        contact_phone: "+79990000000",
        main_customers: "Внутренний список",
      },
      { strategy: "excludeAll" },
    );

    expect(result).toEqual({
      id: 10,
      name: "Партнёр",
      inn: "7707083893",
      partnership_type: PartnershipType.Integrator,
    });
  });
});
