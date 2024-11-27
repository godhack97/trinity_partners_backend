import { IsNotEmptyRu,  IsDateRu, IsEnumRu, IsNumberRu, IsStringRu } from "@decorators/validate";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DealStatus } from "@orm/entities";
import { Type } from "class-transformer";
import { IsEnum, IsOptional } from "class-validator";

export class UpdateDealDto  {

  @ApiProperty({enum: DealStatus})
  @IsNotEmptyRu()
  @IsEnum(DealStatus)
  status: DealStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateRu()
  @Type(() => Date)
  discount_date?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsStringRu()
  special_discount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberRu()
  special_price?: number;
}
