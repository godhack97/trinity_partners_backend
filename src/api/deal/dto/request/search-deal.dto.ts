import { IsDateRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional } from "class-validator";

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
}