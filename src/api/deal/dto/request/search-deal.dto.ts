import { IsDateRu, IsEnumRu } from "@decorators/validate";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DealDuplicateReviewStatus, DealStatus } from "@orm/entities";
import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional } from "class-validator";

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

  @IsEnum(DealDuplicateReviewStatus)
  @IsOptional()
  @ApiPropertyOptional({ enum: DealDuplicateReviewStatus })
  duplicateReviewStatus?: DealDuplicateReviewStatus;

  @ApiProperty()
  @IsOptional()
  @ApiPropertyOptional()
  search?: string;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional()
  distributorId?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: "Фильтр по каноническому ID компании-дистрибьютора",
  })
  distributorCompanyId?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({ description: "Фильтр по компании" })
  companyId?: number;
}
