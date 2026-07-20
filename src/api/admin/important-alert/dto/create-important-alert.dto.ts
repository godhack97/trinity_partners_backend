import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { ImportantAlertSeverity } from "@orm/entities";

export class CreateImportantAlertDto {
  @ApiProperty({ maxLength: 255 })
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ enum: ImportantAlertSeverity, default: ImportantAlertSeverity.Info })
  @IsOptional()
  @IsEnum(ImportantAlertSeverity)
  severity?: ImportantAlertSeverity;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: "ID компании для адресного оповещения; null — для всех компаний",
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  target_company_id?: number | null;
}
