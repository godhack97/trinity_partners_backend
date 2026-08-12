import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdateDealDto } from "./update-deal.dto";

describe("UpdateDealDto", () => {
  it("accepts a partial customer update without requiring INN", async () => {
    const dto = plainToInstance(UpdateDealDto, {
      customer: { company_name: "Обновлённый заказчик" },
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it("accepts a checksum-valid INN correction", async () => {
    const dto = plainToInstance(UpdateDealDto, {
      customer: { inn: "7707 083 893" },
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.customer?.inn).toBe("7707083893");
  });
});
