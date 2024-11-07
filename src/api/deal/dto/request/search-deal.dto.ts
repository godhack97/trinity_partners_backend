import { IsDateRu, IsEnumRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { DealStatus } from "@orm/entities";
import { Type } from "class-transformer";
import { IsEnum, IsOptional } from "class-validator";

export class SearchDealDto {

  @ApiProperty()
  @IsOptional()
  @IsDateRu()
  @Type(() => Date)
  startDate?: Date; 
  
  @ApiProperty()
  @IsDateRu()
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;

  @ApiProperty()
  @IsEnum(DealStatus)
  @IsOptional()
  status?: DealStatus;

  @ApiProperty()
  @IsOptional()
  search?: string;
}