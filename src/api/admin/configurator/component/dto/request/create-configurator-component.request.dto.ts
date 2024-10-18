import { ApiProperty } from "@nestjs/swagger";
import { IsArrayRu, IsNotEmptyRu, MinRu } from "../../../../../../decorators/validate";

export class CreateConfigurationComponentRequestDto {
  @ApiProperty()
  @IsNotEmptyRu()
  name: string;

  @ApiProperty()
  @MinRu(1)
  price: number;

  @ApiProperty()
  @IsNotEmptyRu()
  type_id: string;

  @ApiProperty()
  @IsArrayRu()
  slots: [{
    amount: number;
    increase: boolean;
    slot_id: string;
  }]
}