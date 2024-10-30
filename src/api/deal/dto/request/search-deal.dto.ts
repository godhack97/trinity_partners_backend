<<<<<<< HEAD
import { IsDateRu, IsEnumRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { DealStatus } from "@orm/entities";
import { Type } from "class-transformer";
import { IsEnum, IsOptional } from "class-validator";
=======
import { IsDateRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional } from "class-validator";
>>>>>>> 58ca369 (Добавление роутов выдачи сделок)

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
<<<<<<< HEAD

  @ApiProperty()
  @IsEnum(DealStatus)
  @IsOptional()
  status?: DealStatus;

  @ApiProperty()
  @IsOptional()
  search?: string;
=======
>>>>>>> 58ca369 (Добавление роутов выдачи сделок)
}