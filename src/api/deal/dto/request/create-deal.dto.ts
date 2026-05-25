import { CreateCustomerDto } from "@api/customer/dto/request/create-customer.dto";
import {
  IsDateRu,
  IsNotEmptyRu,
  IsNumberRu,
  IsStringRu,
} from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsOptional } from "class-validator";
import { ValidateNested } from "class-validator";
import { DealConfigurationDto } from "./deal-configuration.dto";

export class CreateDealDto {
  @ApiProperty()
  @IsOptional()
  @IsNumberRu()
  distributor_id?: number;

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsStringRu()
  configuration_link?: string;

  @ApiProperty({ required: false, type: () => [DealConfigurationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DealConfigurationDto)
  configurations?: DealConfigurationDto[];

  @ApiProperty()
  @IsNotEmptyRu()
  @IsDateRu()
  @Type(() => Date)
  purchase_date: Date;

  @ApiProperty()
  comment?: string;
}
