import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ConfirmBitrix24OperationDto } from "./confirm-bitrix24-operation.dto";

describe("ConfirmBitrix24OperationDto", () => {
  it("accepts only an explicit boolean true", async () => {
    const confirmed = plainToInstance(ConfirmBitrix24OperationDto, {
      confirm: true,
    });

    await expect(validate(confirmed)).resolves.toHaveLength(0);
  });

  it.each([
    {},
    { confirm: false },
    { confirm: "true" },
    { confirm: 1 },
  ])("rejects missing or non-true confirmation: %p", async (payload) => {
    const dto = plainToInstance(ConfirmBitrix24OperationDto, payload);

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
