import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { PaginationRequestDto } from "./pagination.request.dto";

describe("PaginationRequestDto", () => {
  it("uses non-zero defaults when pagination is omitted", async () => {
    const dto = plainToInstance(PaginationRequestDto, {});

    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ current_page: 1, limit: 10 });
  });

  it("rejects a zero limit", async () => {
    const dto = plainToInstance(PaginationRequestDto, {
      current_page: "1",
      limit: "0",
    });

    const errors = await validate(dto);
    expect(errors.some(({ property }) => property === "limit")).toBe(true);
  });
});
