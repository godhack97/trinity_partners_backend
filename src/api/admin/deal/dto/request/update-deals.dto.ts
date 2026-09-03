import {
  IsNotEmptyRu,
  IsDateRu,
  IsStringRu,
} from "@decorators/validate";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DealStatus } from "@orm/entities";
import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsPositive, Min } from "class-validator";

export class UpdateAdminDealDto {
  @ApiProperty({ enum: DealStatus })
  @IsNotEmptyRu()
  @IsEnum(DealStatus)
  status: DealStatus;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDateRu()
  registration_expires_at?: Date | null;

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

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 0.01,
    description: "Итоговая сумма сделки при завершении",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  final_deal_sum?: number | null;
}
