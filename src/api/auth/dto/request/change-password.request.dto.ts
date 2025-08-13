import { ApiProperty } from "@nestjs/swagger";
import { MinLengthRu } from "../../../../decorators/validate";

export class UpdatePasswordRequestDto {
  @ApiProperty()
  @MinLengthRu(6)
  password: string;

  @ApiProperty()
  @MinLengthRu(6)
  repeat: string;
}
