import { CreateCustomerDto } from "@api/customer/dto/request/create-customer.dto";
import { ApiPropertyOptional, OmitType, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, ValidateNested } from "class-validator";
import { CreateDealDto } from "./create-deal.dto";

export class UpdateDealCustomerDto extends PartialType(CreateCustomerDto) {}

class UpdateDealFieldsDto extends PartialType(
  OmitType(CreateDealDto, ["customer"] as const),
) {}

export class UpdateDealDto extends UpdateDealFieldsDto {
  @ApiPropertyOptional({ type: () => UpdateDealCustomerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDealCustomerDto)
  customer?: UpdateDealCustomerDto;
}
