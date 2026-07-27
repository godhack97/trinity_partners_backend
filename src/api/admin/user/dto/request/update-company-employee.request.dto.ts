import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class UpdateCompanyEmployeeRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_activated?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  email_confirmed?: boolean;
}
