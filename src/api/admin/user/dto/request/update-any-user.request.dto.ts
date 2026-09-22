import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmailRu, IsRussianPhoneRu } from "@decorators/validate";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";

export class UpdateAnyUserRequestDto {
  @ApiPropertyOptional({
    nullable: true,
    description: "Компания пользователя. null снимает привязку к компании",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  company_id?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmailRu()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_activated?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  email_confirmed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  first_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  last_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @ValidateIf((_object, value) => value !== "")
  @IsRussianPhoneRu()
  @MaxLength(255)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  job_title?: string;
}
