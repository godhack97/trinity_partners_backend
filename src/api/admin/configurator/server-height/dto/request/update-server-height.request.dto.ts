import { ApiProperty } from "@nestjs/swagger";
import { IsStringRu, MinLengthRu } from "../../../../../../decorators/validate";

export class UpdateServerHeightRequestDto {
  @ApiProperty()
  @MinLengthRu(6)
  @IsStringRu()
  id: string;

  @ApiProperty()
  @MinLengthRu(1)
  name: string;
}
