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

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}
