
import { CreateCustomerDto } from "@api/customer/dto/request/create-customer.dto";
import { IsDateRu, IsNotEmptyRu, IsNumberRu, IsStringRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsOptional,
  ValidateNested
} from "class-validator";

export class CreateDealDto {
  
  @ApiProperty()
  @IsNotEmptyRu()
  @IsNumberRu()
  @IsOptional()
  distributor_id: number;

  @ApiProperty({ type: () => CreateCustomerDto })
  @ValidateNested()
  @Type(() => CreateCustomerDto)
  customer: CreateCustomerDto;

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
  @IsOptional()
  @IsNotEmptyRu()
  @IsDateRu()
  @Type(() => Date)
  purchase_date: Date;

  @ApiProperty()
  comment?: string;
}
