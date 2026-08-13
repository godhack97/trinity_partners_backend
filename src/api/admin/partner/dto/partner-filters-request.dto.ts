import { ApiPropertyOptional } from "@nestjs/swagger";
import { CompanyStatus, PartnershipType } from "@orm/entities";
import { IsBoolean, IsEnum, IsOptional } from "class-validator";

export class PartnerFilterRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_activated?: boolean;

  @ApiPropertyOptional({ enum: PartnershipType })
  @IsOptional()
  @IsEnum(PartnershipType)
  partnership_type?: PartnershipType;
}
