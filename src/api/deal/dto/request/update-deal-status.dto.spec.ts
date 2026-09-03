import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DealStatus } from "@orm/entities";
import { UpdateDealStatusDto } from "./update-deal-status.dto";

describe("UpdateDealStatusDto", () => {
  it("accepts a positive final deal sum with two decimal places", async () => {
    const dto = plainToInstance(UpdateDealStatusDto, {
      status: DealStatus.Win,
      final_deal_sum: "123456.78",
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.final_deal_sum).toBe(123456.78);
  });

  it.each([0, -1, 10.123])("rejects invalid final deal sum %s", async (sum) => {
    const dto = plainToInstance(UpdateDealStatusDto, {
      status: DealStatus.Win,
      final_deal_sum: sum,
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
