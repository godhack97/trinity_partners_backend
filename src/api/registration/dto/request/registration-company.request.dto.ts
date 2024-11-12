import { ApiProperty } from '@nestjs/swagger';
import { IsEmailRu, IsNotEmptyRu, IsUrlRu, MinLengthRu } from "@decorators/validate";

export class RegistrationCompanyRequestDto {
  @ApiProperty()
  @MinLengthRu(2)
  company_name: string;

  @ApiProperty()
  @MinLengthRu(10)
  inn: string;

  @ApiProperty()
  @MinLengthRu(2)
  first_name: string;

  @ApiProperty()
  @MinLengthRu(2)
  last_name: string;

  @ApiProperty()
  @IsEmailRu()
  email: string;

  @ApiProperty()
  job_title: string; //должность

  @ApiProperty()
  company_business_line: string; //направления деятельности

  @ApiProperty()
  employees_count: number;

  @ApiProperty()
  @MinLengthRu(6)
  password: string;

  @ApiProperty()
  @IsNotEmptyRu()
  phone: string;

  @ApiProperty()
  site_url: string;

  @ApiProperty()
  promoted_products: string;

  @ApiProperty()
  products_of_interest: string;

  @ApiProperty()
  main_customers: string;
}
