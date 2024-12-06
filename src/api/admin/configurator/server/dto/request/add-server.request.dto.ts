import { IsNotEmptyRu, MinLengthRu, MinRu, IsStringRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsOptional } from "class-validator";

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

  @ApiProperty()
  @IsOptional()
  @IsArray()
  slots: [{
    slot_id: string,
    amount: number,
    on_back_panel: boolean
  }];

  @ApiProperty()
  @IsOptional()
  @IsArray()
  multislots: [{
    multislot_id: string,
    amount: number,
    on_back_panel: boolean
  }];

}
