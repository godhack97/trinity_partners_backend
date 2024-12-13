import { MinLengthRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";

export class AddDistributorRequestDto {
  @ApiProperty()
  @MinLengthRu(1)
  name: string;
}
