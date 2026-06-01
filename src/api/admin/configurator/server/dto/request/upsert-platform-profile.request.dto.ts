import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class PlatformBayDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @IsString()
  placement: string;

  @ApiProperty()
  @IsString()
  bay_kind: string;

  @ApiProperty()
  @IsString()
  form_factor: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  capacity: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  allowed_drive_types: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  pcie_lanes_per_nvme?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  counts_to_rear_pcie?: boolean;
}

export class PlatformForbiddenComponentTypeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @IsString()
  component_type_key: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpsertPlatformProfileRequestDto {
  @ApiProperty()
  @IsString()
  platform_code: string;

  @ApiProperty()
  @IsString()
  family: string;

  @ApiPropertyOptional({ default: "standard" })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional({ default: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  cpu_limit?: number;

  @ApiProperty()
  @IsString()
  ram_type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pcie_generation?: string;

  @ApiPropertyOptional({ default: 80 })
  @IsOptional()
  @IsInt()
  @Min(0)
  pcie_lanes_per_cpu?: number;

  @ApiPropertyOptional({ default: 160 })
  @IsOptional()
  @IsInt()
  @Min(0)
  pcie_lanes_total?: number;

  @ApiPropertyOptional({ default: 96 })
  @IsOptional()
  @IsInt()
  @Min(0)
  rear_pcie_ocp_limit?: number;

  @ApiPropertyOptional({ default: 6 })
  @IsOptional()
  @IsInt()
  @Min(0)
  pcie_slots?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ocp_slots?: number;

  @ApiPropertyOptional({ default: 360 })
  @IsOptional()
  @IsInt()
  @Min(0)
  base_power_w?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  direct_sata_limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  internal_m2_bays?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: [PlatformBayDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlatformBayDto)
  bays?: PlatformBayDto[];

  @ApiPropertyOptional({ type: [PlatformForbiddenComponentTypeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlatformForbiddenComponentTypeDto)
  forbidden_component_types?: PlatformForbiddenComponentTypeDto[];
}
