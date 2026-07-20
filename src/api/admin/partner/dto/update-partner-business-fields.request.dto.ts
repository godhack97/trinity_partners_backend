import { Transform, Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { PartnerLevel, PartnershipType } from "@orm/entities/company.entity";

const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === "string" && value.trim() === "" ? null : value;

export class UpdatePartnerBusinessFieldsRequestDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ enum: PartnershipType })
  @IsOptional()
  @IsEnum(PartnershipType)
  partnership_type?: PartnershipType;

  @ApiPropertyOptional({ enum: PartnerLevel, nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @IsEnum(PartnerLevel)
  partner_level?: PartnerLevel | null;

  @ApiPropertyOptional({ type: String, format: "date", nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @IsDateString({ strict: true })
  certificate_expiry?: string | null;

  @ApiPropertyOptional({ maxLength: 255, nullable: true })
  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email_domain?: string | null;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  company_business_line?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 1000000 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000)
  employees_count?: number;

  @ApiPropertyOptional({ maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  site_url?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  promoted_products?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  products_of_interest?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  main_customers?: string;
}
