import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DealDuplicateReviewStatus } from "@orm/entities";
import { ReviewDealDuplicateDto } from "./review-deal-duplicate.dto";

describe("ReviewDealDuplicateDto", () => {
  it.each([
    DealDuplicateReviewStatus.Duplicate,
    DealDuplicateReviewStatus.NotDuplicate,
  ])("accepts final status %s", async (status) => {
    expect(
      await validate(plainToInstance(ReviewDealDuplicateDto, { status })),
    ).toHaveLength(0);
  });

  it("rejects pending as a manual review result", async () => {
    const errors = await validate(
      plainToInstance(ReviewDealDuplicateDto, {
        status: DealDuplicateReviewStatus.Pending,
      }),
    );
    expect(errors.some(({ property }) => property === "status")).toBe(true);
  });
});
