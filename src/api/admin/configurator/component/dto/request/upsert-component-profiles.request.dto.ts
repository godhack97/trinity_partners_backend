import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Matches, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class ComponentCatalogProfileDto {
  @ApiProperty()
  @IsString()
  component_type_key: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  part_number?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  vendor?: string | null;

  @ApiPropertyOptional({ default: "full" })
  @IsOptional()
  @IsString()
  client_display_mode?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  generation_key?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  server_generation_id?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  processor_generation_id?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  disabled_reason?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  warning_text?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "#D97706" })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-F]{6}$/i, {
    message: "warning_color должен быть цветом в формате #RRGGBB",
  })
  warning_color?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  s4b_status?: string | null;
}

export class ComponentResourceProfileDto {
  @ApiPropertyOptional({ default: "none" })
  @IsOptional()
  @IsString()
  resource_kind?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  pcie_lanes?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  rear_pcie_lanes?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  physical_slots?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ocp_slots?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  internal_ports?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  power_w?: number | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  uses_power?: boolean;
}

export class ComponentPriceProfileDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  base_price?: number | null;

  @ApiPropertyOptional({ default: "USD" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ default: 3.6 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  coefficient?: number;

  @ApiPropertyOptional({ default: "component_price" })
  @IsOptional()
  @IsString()
  price_mode?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  price_required?: boolean;
}

export class CpuProfileDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  socket_profile?: string | null;

  @ApiProperty()
  @IsString()
  ram_type: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  tdp_w?: number | null;

  @ApiPropertyOptional({ default: 8 })
  @IsOptional()
  @IsInt()
  @Min(0)
  memory_channels?: number;

  @ApiPropertyOptional({ default: 16 })
  @IsOptional()
  @IsInt()
  @Min(0)
  max_ram_modules_per_cpu?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  max_ram_gb_per_cpu?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  memory_speed_1dpc?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  memory_speed_2dpc?: number | null;
}

export class RamProfileDto {
  @ApiProperty()
  @IsString()
  ram_type: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  capacity_gb: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  frequency_mhz?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  rank?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  form_factor?: string | null;
}

export class DriveProfileDto {
  @ApiProperty()
  @IsString()
  drive_type: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  interface_type?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  m2_interface?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  media_kind?: string | null;

  @ApiProperty()
  @IsString()
  form_factor: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  capacity_gb: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  speed_class?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  workload_class?: string | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  pcie_lanes?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  power_w?: number | null;
}

export class ControllerProfileDto {
  @ApiProperty()
  @IsString()
  controller_type: string;

  @ApiPropertyOptional({ default: 8 })
  @IsOptional()
  @IsInt()
  @Min(0)
  pcie_lanes?: number;

  @ApiPropertyOptional({ default: 8 })
  @IsOptional()
  @IsInt()
  @Min(0)
  rear_pcie_lanes?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  physical_slots?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  internal_ports?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  m2_slot_count?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  m2_drive_type?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  supports_sata?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  supports_sas?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  supports_nvme?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  power_w?: number | null;
}

export class NetworkProfileDto {
  @ApiProperty()
  @IsString()
  network_kind: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  port_type?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  connector_type?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  port_speed?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  port_speed_gbps?: number | null;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ports_count?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  port_count?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  supported_media?: string | null;

  @ApiPropertyOptional({ default: 8 })
  @IsOptional()
  @IsInt()
  @Min(0)
  pcie_lanes?: number;

  @ApiPropertyOptional({ default: 8 })
  @IsOptional()
  @IsInt()
  @Min(0)
  rear_pcie_lanes?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  physical_slots?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ocp_slots?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  power_w?: number | null;
}

export class GpuProfileDto {
  @ApiPropertyOptional({ default: 16 })
  @IsOptional()
  @IsInt()
  @Min(0)
  pcie_lanes?: number;

  @ApiPropertyOptional({ default: 16 })
  @IsOptional()
  @IsInt()
  @Min(0)
  rear_pcie_lanes?: number;

  @ApiPropertyOptional({ default: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  physical_slots?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  memory_gb?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  power_w?: number | null;
}

export class TransceiverProfileDto {
  @ApiProperty()
  @IsString()
  interface_type: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  connector_type?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  speed?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  speed_gbps?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  media_type?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  wavelength?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  wavelength_or_length?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  compatible_port_type?: string | null;
}

export class PsuProfileDto {
  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  power_w: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  efficiency_class?: string | null;
}

export class ServiceProfileDto {
  @ApiProperty()
  @IsString()
  service_level: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  years: number;

  @ApiProperty()
  @IsString()
  formula: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  percent?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixed_price?: number | null;
}

export class UpsertComponentProfilesRequestDto {
  @ApiPropertyOptional({ type: ComponentCatalogProfileDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ComponentCatalogProfileDto)
  catalog?: ComponentCatalogProfileDto | null;

  @ApiPropertyOptional({ type: ComponentResourceProfileDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ComponentResourceProfileDto)
  resource?: ComponentResourceProfileDto | null;

  @ApiPropertyOptional({ type: ComponentPriceProfileDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ComponentPriceProfileDto)
  price?: ComponentPriceProfileDto | null;

  @ApiPropertyOptional({ type: CpuProfileDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CpuProfileDto)
  cpu?: CpuProfileDto | null;

  @ApiPropertyOptional({ type: RamProfileDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => RamProfileDto)
  ram?: RamProfileDto | null;

  @ApiPropertyOptional({ type: DriveProfileDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => DriveProfileDto)
  drive?: DriveProfileDto | null;

  @ApiPropertyOptional({ type: ControllerProfileDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ControllerProfileDto)
  controller?: ControllerProfileDto | null;

  @ApiPropertyOptional({ type: NetworkProfileDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => NetworkProfileDto)
  network?: NetworkProfileDto | null;

  @ApiPropertyOptional({ type: GpuProfileDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => GpuProfileDto)
  gpu?: GpuProfileDto | null;

  @ApiPropertyOptional({ type: TransceiverProfileDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => TransceiverProfileDto)
  transceiver?: TransceiverProfileDto | null;

  @ApiPropertyOptional({ type: PsuProfileDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => PsuProfileDto)
  psu?: PsuProfileDto | null;

  @ApiPropertyOptional({ type: ServiceProfileDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceProfileDto)
  service?: ServiceProfileDto | null;
}
