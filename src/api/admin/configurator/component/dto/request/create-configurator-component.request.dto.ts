import { ApiProperty } from "@nestjs/swagger";
import { IsArrayRu, IsNotEmptyRu, MinRu } from "../../../../../../decorators/validate";
import { IsOptional } from "class-validator";

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
  subtype: string;

  @ApiProperty()
  @IsOptional()
  @IsArrayRu()
  slots?: [{
    amount: number;
    increase: boolean;
    slot_id: string;
  }]

  @ApiProperty()
  server_generation_id?: string;

  @ApiProperty()
  processor_generation_id?: string;
  
}