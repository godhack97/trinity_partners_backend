import { PaginationRequestDto } from "@app/dto/pagination.request.dto";
import { IsEmailRu, IsRussianPhoneRu } from "@decorators/validate";
import { RoleTypes } from "@app/types/RoleTypes";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CompanyStatus, PartnershipType } from "@orm/entities";
import { Transform, Type } from "class-transformer";
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

export const MANAGED_COMPANY_STATUSES = [
  CompanyStatus.Pending,
  CompanyStatus.Accept,
  CompanyStatus.Suspended,
] as const;

export class CompanyListQueryDto extends PaginationRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() || undefined : value,
  )
  search?: string;

  @ApiPropertyOptional({ enum: PartnershipType })
  @IsOptional()
  @IsEnum(PartnershipType)
  partnership_type?: PartnershipType;

  @ApiPropertyOptional({ enum: MANAGED_COMPANY_STATUSES })
  @IsOptional()
  @IsIn(MANAGED_COMPANY_STATUSES)
  status?: CompanyStatus;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  responsible_manager_id?: number;

  @ApiPropertyOptional({ default: 12, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  override limit: number = 12;
}

export class ApproveCompanyRequestDto {
  @ApiPropertyOptional({
    description:
      "Обязателен для super_admin; partner_manager назначается автоматически",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  responsible_manager_id?: number;
}

export class CompanyRestrictionReasonRequestDto {
  @ApiProperty({ minLength: 1, maxLength: 2000 })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  reason: string;
}

export class AssignCompanyManagerRequestDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  responsible_manager_id: number;
}

export class UpdateCompanyContactsRequestDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @ValidateIf((_object, value) => value !== "")
  @IsEmailRu()
  @MaxLength(255)
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  contact_email?: string;

  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @ValidateIf((_object, value) => value !== "")
  @IsRussianPhoneRu()
  @MaxLength(64)
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : value,
  )
  contact_phone?: string;

  @ApiPropertyOptional({ maxLength: 2048 })
  @IsOptional()
  @ValidateIf((_object, value) => value !== "")
  @IsUrl({ require_protocol: false, require_tld: false })
  @MaxLength(2048)
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : value,
  )
  site_url?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : value,
  )
  company_business_line?: string;
}

export const COMPANY_MANAGEMENT_READ_ROLES = [
  RoleTypes.SuperAdmin,
  RoleTypes.PartnerManager,
  RoleTypes.TechnicalSpecialist,
];
