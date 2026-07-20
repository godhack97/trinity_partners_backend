import {
  IsNotEmptyRu,
  IsDateRu,
  IsStringRu,
} from "@decorators/validate";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DealStatus } from "@orm/entities";
import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, Min } from "class-validator";

export class UpdateDealDto {
  @ApiProperty({ enum: DealStatus })
  @IsNotEmptyRu()
  @IsEnum(DealStatus)
  status: DealStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateRu()
  @Type(() => Date)
  discount_date?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsStringRu()
  special_discount?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  special_price?: number | null;
}
