import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsEnum, IsBoolean, IsNumber } from "class-validator";
import { ImportantAlertSeverity } from "@orm/entities";

export class CreateImportantAlertDto {
  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional({ enum: ImportantAlertSeverity, default: ImportantAlertSeverity.Info })
  @IsOptional()
  @IsEnum(ImportantAlertSeverity)
  severity?: ImportantAlertSeverity;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: "ID компании для адресного оповещения" })
  @IsOptional()
  @IsNumber()
  target_company_id?: number;
}
