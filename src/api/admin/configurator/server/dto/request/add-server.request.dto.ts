import { IsNotEmptyRu, MinLengthRu, MinRu, IsStringRu, IsBooleanRu, IsNumberRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsOptional, ValidateNested } from "class-validator";

class BaseServerSlotDto {
    @ApiProperty()
    @IsNotEmptyRu()
    @IsNumberRu()
    amount: number;

    @ApiProperty()
    @IsOptional()
    @IsBooleanRu()
    on_back_panel: boolean;
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
  name: string;

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

  @ApiProperty()
  @IsOptional()
  @IsStringRu()
  image: string;

  @ApiProperty()
  @IsOptional()
  @IsStringRu()
  guide: string;

  @ApiProperty()
  @IsOptional()
  @IsStringRu()
  cert: string;

  @ApiProperty({type: [ServerSlotDto]})
  @IsOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => ServerSlotDto)
  slots: ServerSlotDto[];

  @ApiProperty({ type: [ServerMultislotDto]})
  @IsOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => ServerMultislotDto)
  multislots: ServerMultislotDto[];
}
