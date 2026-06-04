import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class ComponentCatalogProfileDto {
  @IsString()
  component_type_key: string;

  @IsOptional()
  @IsString()
  part_number?: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsString()
  client_display_mode?: string;

  @IsOptional()
  @IsString()
  generation_key?: string;

  @IsOptional()
  @IsString()
  server_generation_id?: string;

  @IsOptional()
  @IsString()
  processor_generation_id?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  disabled_reason?: string;

  @IsOptional()
  @IsString()
  s4b_status?: string;
}

export class ComponentResourceProfileDto {
  @IsOptional()
  @IsString()
  resource_kind?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  pcie_lanes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  rear_pcie_lanes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  physical_slots?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ocp_slots?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  internal_ports?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  power_w?: number;

  @IsOptional()
  @IsBoolean()
  uses_power?: boolean;
}

export class ComponentPriceProfileDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  base_price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  coefficient?: number;

  @IsOptional()
  @IsString()
  price_mode?: string;

  @IsOptional()
  @IsBoolean()
  price_required?: boolean;
}

export class CpuProfileDto {
  @IsOptional()
  @IsString()
  socket_profile?: string;

  @IsString()
  ram_type: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  tdp_w?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  memory_channels?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  max_ram_modules_per_cpu?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  max_ram_gb_per_cpu?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  memory_speed_1dpc?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  memory_speed_2dpc?: number;
}

export class RamProfileDto {
  @IsString()
  ram_type: string;

  @IsInt()
  @Min(0)
  capacity_gb: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  frequency_mhz?: number;

  @IsOptional()
  @IsString()
  rank?: string;

  @IsOptional()
  @IsString()
  form_factor?: string;
}

export class DriveProfileDto {
  @IsString()
  drive_type: string;

  @IsOptional()
  @IsString()
  interface_type?: string;

  @IsOptional()
  @IsString()
  media_kind?: string;

  @IsString()
  form_factor: string;

  @IsInt()
  @Min(0)
  capacity_gb: number;

  @IsOptional()
  @IsString()
  speed_class?: string;

  @IsOptional()
  @IsString()
  workload_class?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  pcie_lanes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  power_w?: number;
}

export class ControllerProfileDto {
  @IsString()
  controller_type: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  pcie_lanes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  rear_pcie_lanes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  physical_slots?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  internal_ports?: number;

  @IsOptional()
  @IsBoolean()
  supports_sata?: boolean;

  @IsOptional()
  @IsBoolean()
  supports_sas?: boolean;

  @IsOptional()
  @IsBoolean()
  supports_nvme?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  power_w?: number;
}

export class NetworkProfileDto {
  @IsString()
  network_kind: string;

  @IsOptional()
  @IsString()
  port_type?: string;

  @IsOptional()
  @IsString()
  port_speed?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  ports_count?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  pcie_lanes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  rear_pcie_lanes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  physical_slots?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ocp_slots?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  power_w?: number;
}

export class GpuProfileDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  pcie_lanes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  rear_pcie_lanes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  physical_slots?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  power_w?: number;
}

export class TransceiverProfileDto {
  @IsString()
  interface_type: string;

  @IsOptional()
  @IsString()
  speed?: string;

  @IsOptional()
  @IsString()
  media_type?: string;

  @IsOptional()
  @IsString()
  wavelength?: string;

  @IsOptional()
  @IsString()
  compatible_port_type?: string;
}

export class PsuProfileDto {
  @IsInt()
  @Min(0)
  power_w: number;

  @IsOptional()
  @IsString()
  efficiency_class?: string;
}

export class ServiceProfileDto {
  @IsString()
  service_level: string;

  @IsInt()
  @Min(0)
  years: number;

  @IsString()
  formula: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  percent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fixed_price?: number;
}

export class UpsertComponentProfilesRequestDto {
  @ApiPropertyOptional({ type: ComponentCatalogProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ComponentCatalogProfileDto)
  catalog?: ComponentCatalogProfileDto;

  @ApiPropertyOptional({ type: ComponentResourceProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ComponentResourceProfileDto)
  resource?: ComponentResourceProfileDto;

  @ApiPropertyOptional({ type: ComponentPriceProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ComponentPriceProfileDto)
  price?: ComponentPriceProfileDto;

  @ApiPropertyOptional({ type: CpuProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CpuProfileDto)
  cpu?: CpuProfileDto;

  @ApiPropertyOptional({ type: RamProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RamProfileDto)
  ram?: RamProfileDto;

  @ApiPropertyOptional({ type: DriveProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DriveProfileDto)
  drive?: DriveProfileDto;

  @ApiPropertyOptional({ type: ControllerProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ControllerProfileDto)
  controller?: ControllerProfileDto;

  @ApiPropertyOptional({ type: NetworkProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NetworkProfileDto)
  network?: NetworkProfileDto;

  @ApiPropertyOptional({ type: GpuProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GpuProfileDto)
  gpu?: GpuProfileDto;

  @ApiPropertyOptional({ type: TransceiverProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TransceiverProfileDto)
  transceiver?: TransceiverProfileDto;

  @ApiPropertyOptional({ type: PsuProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PsuProfileDto)
  psu?: PsuProfileDto;

  @ApiPropertyOptional({ type: ServiceProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceProfileDto)
  service?: ServiceProfileDto;
}
