import { IsEmailRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";

export class AddEmployeeRequestDto {
  @ApiProperty()
  @IsEmailRu()
  email: string;
}
