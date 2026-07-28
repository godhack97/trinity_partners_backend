import { ApiPropertyOptional } from "@nestjs/swagger";
import { CompanyStatus } from "@orm/entities";
import { IsBoolean, IsEnum, IsIn, IsOptional } from "class-validator";

export class PartnerFilterRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_activated?: boolean;

  @ApiPropertyOptional({ enum: ["integrator", "distributor"] })
  @IsOptional()
  @IsIn(["integrator", "distributor"])
  partnership_type?: "integrator" | "distributor";
}
