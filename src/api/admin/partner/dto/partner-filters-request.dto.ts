import { ApiPropertyOptional } from "@nestjs/swagger";
import { CompanyStatus } from "@orm/entities";
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
}
