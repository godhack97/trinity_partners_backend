import { IsEmailRu, IsNotEmptyRu, MinLengthRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class CreateCustomerDto {
  @ApiProperty()
  @MinLengthRu(2)
  first_name: string;

  @ApiProperty()
  @MinLengthRu(2)
  last_name: string;

  @ApiProperty()
  @MinLengthRu(10)
  inn: string;

  @ApiProperty()
  @MinLengthRu(2)
  company_name: string;

  @ApiProperty()
  @IsEmailRu()
  email: string;

  @ApiProperty()
  @IsNotEmptyRu()
  @IsOptional()
  phone: string;
}
