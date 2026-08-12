import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DealDuplicateReviewStatus } from "@orm/entities";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

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

  @ApiPropertyOptional({
    description: "Комментарий менеджера по результату проверки дубликата",
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
