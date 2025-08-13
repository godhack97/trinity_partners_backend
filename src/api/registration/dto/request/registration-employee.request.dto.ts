import { ApiProperty } from "@nestjs/swagger";
import { IsEmailRu, IsNotEmptyRu } from "../../../../decorators/validate";

export class RegistrationEmployeeRequestDto {
  @ApiProperty()
  first_name: string;

  @ApiProperty()
  last_name: string;

  @ApiProperty()
  @IsEmailRu()
  email: string;

  @ApiProperty()
  job_title: string;

  @ApiProperty()
  password: string;

  @ApiProperty()
  @IsNotEmptyRu()
  phone: string;

  @ApiProperty()
  @IsNotEmptyRu()
  company_inn: string;
}
