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

  it("accepts an optional review comment up to 1000 characters", async () => {
    const withoutComment = plainToInstance(ReviewDealDuplicateDto, {
      status: DealDuplicateReviewStatus.NotDuplicate,
    });
    const atLimit = plainToInstance(ReviewDealDuplicateDto, {
      status: DealDuplicateReviewStatus.Duplicate,
      comment: "x".repeat(1000),
    });

    expect(await validate(withoutComment)).toHaveLength(0);
    expect(await validate(atLimit)).toHaveLength(0);
  });

  it.each(["x".repeat(1001), 123])(
    "rejects invalid review comment %s",
    async (comment) => {
      const errors = await validate(
        plainToInstance(ReviewDealDuplicateDto, {
          status: DealDuplicateReviewStatus.Duplicate,
          comment,
        }),
      );

      expect(errors.some(({ property }) => property === "comment")).toBe(true);
    },
  );
});
