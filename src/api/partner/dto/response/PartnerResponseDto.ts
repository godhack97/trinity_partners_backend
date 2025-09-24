import { WithIdDto } from "@app/dto/with-id.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class PartnerResponseDto extends WithIdDto {
  @ApiProperty()
  @Expose()
  inn: string;

  @ApiProperty()
  @Expose()
  owner_id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  company_business_line: string;

  @ApiProperty()
  @Expose()
  employees_count: number;

  @ApiProperty()
  @Expose()
  site_url: string;

  @ApiProperty()
  @Expose()
  promoted_products: string;

  @ApiProperty()
  @Expose()
  products_of_interest: string;

  @ApiProperty()
  @Expose()
  main_customers: string;

  @ApiProperty()
  @Expose()
  status: string;

  @ApiProperty()
  @Expose()
  manager_id: number;
}