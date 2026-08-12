import { ApiProperty } from "@nestjs/swagger";
import { PartnershipType } from "@orm/entities/company.entity";
import { Expose } from "class-transformer";

export class CompanyPartnerOptionResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  inn: string;

  @ApiProperty({ enum: PartnershipType })
  @Expose()
  partnership_type: PartnershipType;
}
