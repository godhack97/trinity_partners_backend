import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class SmtpSettingsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  host: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @IsBoolean()
  secure: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  username: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  password?: string;
}
