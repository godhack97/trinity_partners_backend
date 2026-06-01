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
}

export class ValidateConfiguratorOptionsDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  strict?: boolean;
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
