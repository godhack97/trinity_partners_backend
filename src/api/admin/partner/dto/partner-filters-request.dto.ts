import { ApiPropertyOptional } from "@nestjs/swagger";
import { CompanyStatus } from "@orm/entities";
import { IsBoolean, IsOptional } from "class-validator";

export class PartnerFilterRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  status?: CompanyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_activated?: boolean;
}
