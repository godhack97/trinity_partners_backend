import { MinLengthRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";

export class AddProcessorGenerationRequestDto {
  @ApiProperty()
  @MinLengthRu(1)
  name: string;
}
