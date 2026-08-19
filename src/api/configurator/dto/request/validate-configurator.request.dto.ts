import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class ValidateConfiguratorItemDto {
  @ApiProperty()
  @IsString()
  component_id: string;

  @ApiProperty({ default: 1 })
  @Min(0)
  qty: number;

  @ApiPropertyOptional({ enum: ["manual", "auto_added", "suppressed"], default: "manual" })
  @IsOptional()
  @IsString()
  source?: "manual" | "auto_added" | "suppressed";
}

export class ValidateConfiguratorOptionsDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  strict?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  rear_to_pcie?: boolean;
}

export class ValidateConfiguratorSupportDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ default: 3 })
  @Min(0)
  years: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formula?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Min(0)
  percent?: number;
}

export class ValidateConfiguratorRequestDto {
  @ApiProperty()
  @IsString()
  server_id: string;

  @ApiProperty({ type: [ValidateConfiguratorItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidateConfiguratorItemDto)
  items: ValidateConfiguratorItemDto[];

  @ApiPropertyOptional({ type: ValidateConfiguratorOptionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ValidateConfiguratorOptionsDto)
  options?: ValidateConfiguratorOptionsDto;

  @ApiPropertyOptional({ type: ValidateConfiguratorSupportDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ValidateConfiguratorSupportDto)
  support?: ValidateConfiguratorSupportDto;
}

export class DryRunRemoveConfiguratorRequestDto extends ValidateConfiguratorRequestDto {
  @ApiProperty()
  @IsString()
  remove_component_id: string;
}
