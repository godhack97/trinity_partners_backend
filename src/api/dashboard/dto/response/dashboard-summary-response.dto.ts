import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

export class PartnerInfoDto {
  @ApiProperty()
  @Expose()
  status: string;

  @ApiProperty()
  @Expose()
  status_label: string;

  @ApiProperty()
  @Expose()
  certificate_expiry: string;

  @ApiProperty()
  @Expose()
  company_name: string;
}

export class PersonalManagerDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  first_name: string;

  @ApiProperty()
  @Expose()
  last_name: string;

  @ApiProperty()
  @Expose()
  phone: string;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty()
  @Expose()
  photo_url: string;
}

export class DashboardSummaryResponseDto {
  @ApiProperty({ type: () => PartnerInfoDto })
  @Expose()
  @Type(() => PartnerInfoDto)
  partner: PartnerInfoDto;

  @ApiProperty({ type: () => PersonalManagerDto, nullable: true })
  @Expose()
  @Type(() => PersonalManagerDto)
  personal_manager: PersonalManagerDto | null;
}
