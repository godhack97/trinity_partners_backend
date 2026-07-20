import { ApiPropertyOptional } from "@nestjs/swagger";
import { RoleTypes } from "../../../../../types/RoleTypes";
import { CompanyEmployeeStatus } from "@orm/entities";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { PaginationRequestDto } from "../../../../../dto/pagination.request.dto";

export class UserFilterRequestDto extends PaginationRequestDto {
  @ApiPropertyOptional({ enum: RoleTypes })
  @IsOptional()
  @IsEnum(RoleTypes)
  role_name?: RoleTypes;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }) =>
    value === true || value === "true"
      ? true
      : value === false || value === "false"
        ? false
        : value,
  )
  @IsBoolean()
  is_activated?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  company_id?: number;

  @ApiPropertyOptional({ enum: CompanyEmployeeStatus })
  @IsOptional()
  @IsEnum(CompanyEmployeeStatus)
  status?: CompanyEmployeeStatus;
}
