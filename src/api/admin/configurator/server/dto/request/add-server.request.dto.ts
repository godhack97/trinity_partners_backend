import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmptyRu, MinLengthRu, MinRu } from "../../../../../../decorators/validate";
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
  @MinRu(1)
  price: number;

  @ApiProperty()
  @IsOptional()
  image_id: number;

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
