import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateCustomerDto } from "./create-customer.dto";

const validCustomer = {
  first_name: "Иван",
  last_name: "Иванов",
  inn: "7707083893",
  company_name: "ООО Заказчик",
  email: "customer@example.com",
};

describe("CreateCustomerDto", () => {
  it("normalizes a formatted, checksum-valid INN", async () => {
    const dto = plainToInstance(CreateCustomerDto, {
      ...validCustomer,
      inn: " (7707) 083-893 ",
    });

    expect(dto.inn).toBe("7707083893");
    expect(await validate(dto)).toHaveLength(0);
  });

  it.each(["7707083894", "123456789", "7707A083893", 7707083893])(
    "rejects invalid INN %s",
    async (inn) => {
      const dto = plainToInstance(CreateCustomerDto, {
        ...validCustomer,
        inn,
      });
      const errors = await validate(dto);

      expect(errors.some(({ property }) => property === "inn")).toBe(true);
    },
  );

  it("does not accept a client-supplied normalized INN", () => {
    const dto = plainToInstance(CreateCustomerDto, {
      ...validCustomer,
      inn_normalized: "500100732259",
    });

    expect(dto).not.toHaveProperty("inn_normalized");
  });

  it.each([
    { email: "customer@example", phone: "+7 (999) 123-45-67" },
    { email: "customer@example.com", phone: "+79991234567" },
  ])("rejects contacts outside the email or phone mask", async (contacts) => {
    const errors = await validate(
      plainToInstance(CreateCustomerDto, { ...validCustomer, ...contacts }),
    );

    expect(
      errors.some(({ property }) => property === "email" || property === "phone"),
    ).toBe(true);
  });

  it("allows the optional phone to be empty", async () => {
    const errors = await validate(
      plainToInstance(CreateCustomerDto, { ...validCustomer, phone: "" }),
    );

    expect(errors).toHaveLength(0);
  });

});
