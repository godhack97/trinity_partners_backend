import { ApiProperty } from "@nestjs/swagger";
import { DealDuplicateReviewStatus } from "@orm/entities";
import { IsIn } from "class-validator";

export const FINAL_DUPLICATE_REVIEW_STATUSES = [
  DealDuplicateReviewStatus.Duplicate,
  DealDuplicateReviewStatus.NotDuplicate,
] as const;

export class ReviewDealDuplicateDto {
  @ApiProperty({ enum: FINAL_DUPLICATE_REVIEW_STATUSES })
  @IsIn([...FINAL_DUPLICATE_REVIEW_STATUSES])
  status:
    | DealDuplicateReviewStatus.Duplicate
    | DealDuplicateReviewStatus.NotDuplicate;
}
