import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export class DealConfigurationComponentDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  typeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({
    description: "How the configurator selected the component",
    enum: ["manual", "auto_added", "suppressed"],
  })
  @IsOptional()
  @IsString()
  source?: string;
}

export class DealConfigurationSupportDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiPropertyOptional({
    description: "Configurator catalog component that provides this support option",
  })
  @IsOptional()
  @IsString()
  componentId?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  years: number;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Pricing formula captured from the configurator catalog",
  })
  @IsOptional()
  @IsString()
  formula?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  percent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warningText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warningColor?: string;
}

export class DealConfigurationDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serverId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serverboxHeightId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  serverPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ type: () => [DealConfigurationComponentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DealConfigurationComponentDto)
  components?: DealConfigurationComponentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  componentsPrice?: number;

  @ApiPropertyOptional({
    description: "Configurator-specific options stored with the deal snapshot",
    type: Object,
  })
  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;

  @ApiPropertyOptional({ type: () => DealConfigurationSupportDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DealConfigurationSupportDto)
  support?: DealConfigurationSupportDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}
