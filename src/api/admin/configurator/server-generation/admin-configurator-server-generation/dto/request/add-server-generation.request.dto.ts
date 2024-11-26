import { MinLengthRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";

export class AddServerGenerationRequestDto {
  @ApiProperty()
  @MinLengthRu(1)
  name: string;
}
