import { ApiProperty } from "@nestjs/swagger";
import { MinLengthRu } from "../../../../../../decorators/validate";

export class AddServerHeightRequestDto {
  @ApiProperty()
  @MinLengthRu(1)
  name: string;
}
