import {
  IsNotEmptyRu,
  MinLengthRu,
  MinRu,
  IsStringRu,
  IsBooleanRu,
  IsNumberRu,
} from "@decorators/validate";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsDefined, IsOptional, ValidateNested } from "class-validator";
import { UpsertPlatformProfileRequestDto } from "./upsert-platform-profile.request.dto";

class BaseServerSlotDto {
  @ApiProperty()
  @IsNotEmptyRu()
  @IsNumberRu()
  amount: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBooleanRu()
  on_back_panel?: boolean;
}

export class ServerSlotDto extends BaseServerSlotDto {
  @ApiProperty()
  @IsStringRu()
  slot_id: string;
}

export class ServerMultislotDto extends BaseServerSlotDto {
  @ApiProperty()
  @IsStringRu()
  multislot_id: string;
}

export class AddServerRequestDto {
  @ApiProperty()
  @IsNotEmptyRu()
  @IsStringRu()
  name: string;

  @ApiProperty()
  @IsNotEmptyRu()
  @IsStringRu()
  description: string;

  @ApiProperty()
  @IsNotEmptyRu()
  @MinLengthRu(1)
  serverbox_height_id: string;

  @ApiProperty()
  @IsNotEmptyRu()
  @MinLengthRu(1)
  server_generation_id: string;

  @ApiProperty()
  @IsNotEmptyRu()
  @MinRu(1)
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsStringRu()
  image?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsStringRu()
  guide?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsStringRu()
  cert?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsStringRu()
  gisp?: string;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsNumberRu()
  sort?: number;

  @ApiPropertyOptional({ type: [ServerSlotDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServerSlotDto)
  slots?: ServerSlotDto[];

  @ApiPropertyOptional({ type: [ServerMultislotDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServerMultislotDto)
  multislots?: ServerMultislotDto[];
}

export class SaveServerWithProfileRequestDto extends AddServerRequestDto {
  @ApiProperty({ type: () => UpsertPlatformProfileRequestDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => UpsertPlatformProfileRequestDto)
  profile: UpsertPlatformProfileRequestDto;
}
