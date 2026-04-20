import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsEnum, IsBoolean } from "class-validator";
import { ImportantAlertSeverity } from "@orm/entities";

export class UpdateImportantAlertDto {
  @ApiPropertyOptional()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional({ enum: ImportantAlertSeverity })
  @IsOptional()
  @IsEnum(ImportantAlertSeverity)
  severity?: ImportantAlertSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
