
import { IsDateRu, IsNotEmptyRu, IsNumberRu, IsStringRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class CreateDealDto {
  
  deal_num?: string;

  @ApiProperty()
  @IsNotEmptyRu()
  @IsNumberRu()
  distributor_id: number;

  @ApiProperty()
  @IsNotEmptyRu()
  @IsNumberRu()
  customer_id: number;

  @ApiProperty()
  @IsNotEmptyRu()
  @IsNumberRu()
  partner_id: number;

  @ApiProperty()
  title?: string;

  @ApiProperty()
  @IsNotEmptyRu()
  @IsNumberRu()
  deal_sum: number;

  @ApiProperty()
  competition_link?: string;

  @ApiProperty()
  @IsNotEmptyRu()
  @IsStringRu()
  configuration_link: string;

  @ApiProperty()
  @IsNotEmptyRu()
  @IsDateRu()
  @Type(() => Date)
  purchase_date: Date;

  @ApiProperty()
  comment?: string;
}
