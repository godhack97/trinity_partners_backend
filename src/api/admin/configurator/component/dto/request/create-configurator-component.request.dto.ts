import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmptyRu,
  MinRu,
} from "@decorators/validate";
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { UpsertComponentProfilesRequestDto } from "./upsert-component-profiles.request.dto";

export class ConfigurationComponentSlotDto {
  @ApiProperty()
  @IsString()
  slot_id: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  increase?: boolean;
}

export class CreateConfigurationComponentRequestDto {
  @ApiProperty()
  @IsNotEmptyRu()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ minimum: 0 })
  @MinRu(0)
  price: number;

  @ApiProperty()
  @IsNotEmptyRu()
  type_id: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  subtype?: string | null;

  @ApiPropertyOptional({ type: [ConfigurationComponentSlotDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfigurationComponentSlotDto)
  slots?: ConfigurationComponentSlotDto[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  server_generation_id?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  processor_generation_id?: string | null;
}

export class SaveConfigurationComponentRequestDto extends CreateConfigurationComponentRequestDto {
  @ApiProperty({ type: () => UpsertComponentProfilesRequestDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => UpsertComponentProfilesRequestDto)
  profiles: UpsertComponentProfilesRequestDto;
}
