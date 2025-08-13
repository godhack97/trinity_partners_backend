import { IsDateRu, IsEnumRu } from "@decorators/validate";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DealStatus } from "@orm/entities";
import { Type } from "class-transformer";
import { IsEnum, IsOptional } from "class-validator";

export class SearchDealDto {
  @ApiProperty()
  @IsOptional()
  @IsDateRu()
  @Type(() => Date)
  @ApiPropertyOptional()
  startDate?: Date;

  @ApiProperty()
  @IsDateRu()
  @IsOptional()
  @Type(() => Date)
  @ApiPropertyOptional()
  endDate?: Date;

  @ApiProperty()
  @IsEnum(DealStatus, { each: true })
  @IsOptional()
  @ApiPropertyOptional({ enum: DealStatus })
  status?: DealStatus;

  @ApiProperty()
  @IsOptional()
  @ApiPropertyOptional()
  search?: string;
}
