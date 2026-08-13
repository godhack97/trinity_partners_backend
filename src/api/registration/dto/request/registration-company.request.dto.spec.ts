import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { RegistrationCompanyRequestDto } from "./registration-company.request.dto";

describe("RegistrationCompanyRequestDto", () => {
  it.each(["integrator", "distributor"])(
    "allows the public partnership type %s",
    async (partnershipType) => {
      const dto = plainToInstance(RegistrationCompanyRequestDto, {
        partnership_type: partnershipType,
      });

      const errors = await validate(dto, { skipMissingProperties: true });

      expect(errors).toHaveLength(0);
    },
  );

  it("does not allow assigning the vendor type through public registration", async () => {
    const dto = plainToInstance(RegistrationCompanyRequestDto, {
      partnership_type: "vendor",
    });

    const errors = await validate(dto, { skipMissingProperties: true });

    expect(errors.map(({ property }) => property)).toContain("partnership_type");
  });
});
