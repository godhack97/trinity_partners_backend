import { IsBooleanRu, IsNotEmptyRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";

export class AddEmployeeAdminRequestDto {
  @ApiProperty()
  @IsBooleanRu()
  @IsNotEmptyRu()
  isEmployeeAdmin: boolean;
}