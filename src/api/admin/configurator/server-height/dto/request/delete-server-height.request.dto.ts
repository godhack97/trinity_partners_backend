import { ApiProperty } from "@nestjs/swagger";
import { IsStringRu, MinLengthRu } from "../../../../../../decorators/validate";

export class DeleteServerHeightRequestDto {
  @ApiProperty()
  @MinLengthRu(6)
  @IsStringRu()
  id: string;
}
