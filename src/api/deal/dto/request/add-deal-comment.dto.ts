import { IsNotEmptyRu, IsStringRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";

export class AddDealCommentDto {
  @ApiProperty()
  @IsNotEmptyRu()
  @IsStringRu()
  text: string;
}
